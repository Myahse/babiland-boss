// Package shop: what's paid with real money (F CFA), as in Babi Life: GeniusPay's page (Wave, Orange Money,
// MTN, Moov) or a card (Stripe). The game is played for free from start to end; diamonds only make things
// faster (a x2 boost, a bag of money, a shield for a district, the « gros bras » at once, a VIP now), and the
// Pass Boss gives a quarter more on every sale for a month. Prices are set here, never by the phone. A purchase
// is credited once the payment service says, when asked, that it's paid the right sum, and only once.
package shop

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/myahse/babiland-boss/backend/internal/auth"
	"github.com/myahse/babiland-boss/backend/internal/httpx"
)

// Pack: diamonds for a price in F CFA; the bigger ones give more per franc.
type Pack struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Price    int    `json:"price"`
	Diamonds int    `json:"diamonds"`
	Bonus    string `json:"bonus,omitempty"`
}

var Packs = []Pack{
	{ID: "poignee", Label: "Une poignée", Price: 500, Diamonds: 50},
	{ID: "sachet", Label: "Le sachet", Price: 1000, Diamonds: 110, Bonus: "+10 %"},
	{ID: "panier", Label: "Le panier", Price: 2500, Diamonds: 300, Bonus: "+20 %"},
	{ID: "bassine", Label: "La bassine", Price: 5000, Diamonds: 650, Bonus: "+30 %"},
	{ID: "camion", Label: "Le camion", Price: 10_000, Diamonds: 1400, Bonus: "+40 %"},
}

// Pass: bought with money directly.
const PassPrice, PassDays = 1500, 30

// Boost: spent with diamonds, in the game.
type Boost struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Text     string `json:"text"`
	Diamonds int    `json:"diamonds"`
	// District: used on one of your districts (shield, gros bras)
	District bool `json:"district,omitempty"`
}

var Boosts = []Boost{
	{ID: "x2", Label: "Ventes ×2 · 30 min", Text: "Chaque plat vendu rapporte le double pendant 30 minutes, dans tous tes maquis.", Diamonds: 30},
	{ID: "sac", Label: "Sac d'argent", Text: "Un gros sac de francs tout de suite (plus gros quand ton niveau monte).", Diamonds: 25},
	{ID: "vip", Label: "Un client VIP maintenant", Text: "Un VIP arrive tout de suite au maquis (paie jusqu'à ×3).", Diamonds: 10},
	{ID: "bouclier", Label: "Bouclier 8 h", Text: "Personne ne peut attaquer ce quartier pendant 8 heures.", Diamonds: 50, District: true},
	{ID: "grosbras", Label: "Gros bras au max", Text: "Les gros bras niveau 3 dans ce quartier : les rivaux doivent servir 6 clients de plus.", Diamonds: 40, District: true},
}

func findPack(id string) (Pack, bool) {
	for _, p := range Packs {
		if p.ID == id {
			return p, true
		}
	}
	return Pack{}, false
}
func findBoost(id string) (Boost, bool) {
	for _, b := range Boosts {
		if b.ID == id {
			return b, true
		}
	}
	return Boost{}, false
}

type Handler struct {
	DB   *pgxpool.Pool
	Pay  *GeniusPay // nil: Mobile Money not set up
	Card *Stripe    // nil: cards not set up
	// Site: where the player comes back to; API: this server's own address (for GeniusPay's webhook)
	Site, API string
	// Changed: tell the player's devices (diamonds, Pass)
	Changed func(user string)
}

// Routes: signed in.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/shop", h.view)
	r.Post("/shop/buy", h.buy)
	r.Post("/shop/purchase/{id}", h.check)
	r.Post("/shop/spend", h.spend)
}

// Hooks: the payment services telling us (not signed in, their signature checked).
func (h *Handler) Hooks(r chi.Router) {
	r.Post("/shop/geniuspay", h.geniusHook)
	r.Post("/shop/stripe", h.stripeHook)
}

type view struct {
	Mobile    bool       `json:"mobile"`
	Card      bool       `json:"card"`
	Sandbox   bool       `json:"sandbox,omitempty"`
	Packs     []Pack     `json:"packs"`
	Pass      int        `json:"passPrice"`
	Boosts    []Boost    `json:"boosts"`
	Operators []Operator `json:"operators"`
	Diamonds  int        `json:"diamonds"`
	PassUntil *time.Time `json:"passUntil,omitempty"`
	Boost     *time.Time `json:"boostUntil,omitempty"`
}

func (h *Handler) tester(ctx context.Context, user string) bool {
	var t bool
	_ = h.DB.QueryRow(ctx, `SELECT tester FROM users WHERE id = $1`, user).Scan(&t)
	return t
}

func (h *Handler) view(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := auth.UserID(ctx)
	v := view{Packs: Packs, Pass: PassPrice, Boosts: Boosts, Operators: Operators}
	if err := h.DB.QueryRow(ctx, `SELECT diamonds, pass_until, boost_until FROM users WHERE id = $1`, user).Scan(&v.Diamonds, &v.PassUntil, &v.Boost); err != nil {
		httpx.Error(w, http.StatusNotFound, "compte introuvable")
		return
	}
	t := h.tester(ctx, user)
	// test keys: nothing is really paid, so only the team's accounts buy
	v.Mobile = h.Pay != nil && (!h.Pay.Sandbox() || t)
	v.Card = h.Card != nil && (!h.Card.Test() || t)
	v.Sandbox = (h.Pay != nil && h.Pay.Sandbox()) || (h.Card != nil && h.Card.Test())
	if v.PassUntil != nil && v.PassUntil.Before(time.Now()) {
		v.PassUntil = nil
	}
	if v.Boost != nil && v.Boost.Before(time.Now()) {
		v.Boost = nil
	}
	httpx.JSON(w, http.StatusOK, v)
}

var errShut = errors.New("la boutique ouvre bientôt")

// buy: a payment opened for a pack of diamonds or the Pass; the phone opens the page to pay on.
func (h *Handler) buy(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := auth.UserID(ctx)
	var req struct {
		Pack     string `json:"pack,omitempty"`
		Pass     bool   `json:"pass,omitempty"`
		Method   string `json:"method"` // "mobile" or "carte"
		Operator string `json:"operator,omitempty"`
	}
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	item, label, price, diamonds := "pass", fmt.Sprintf("Pass Boss · %d jours", PassDays), PassPrice, 0
	if !req.Pass {
		p, ok := findPack(req.Pack)
		if !ok {
			httpx.Error(w, http.StatusUnprocessableEntity, "article inconnu")
			return
		}
		item, label, price, diamonds = p.ID, fmt.Sprintf("%d diamants (%s)", p.Diamonds, p.Label), p.Price, p.Diamonds
	}
	card := req.Method == "carte"
	if card && h.Card == nil || !card && h.Pay == nil {
		httpx.Error(w, http.StatusServiceUnavailable, errShut.Error())
		return
	}
	test := card && h.Card.Test() || !card && h.Pay.Sandbox()
	if test && !h.tester(ctx, user) {
		httpx.Error(w, http.StatusServiceUnavailable, errShut.Error())
		return
	}
	var waiting int
	_ = h.DB.QueryRow(ctx, `SELECT count(*) FROM purchases WHERE user_id = $1 AND credited_at IS NULL AND status IN ('created', 'pending') AND created_at > now() - interval '15 minutes'`, user).Scan(&waiting)
	if waiting >= 5 {
		httpx.Error(w, http.StatusTooManyRequests, "trop d'achats en attente : termine ceux en cours")
		return
	}
	method := "mobile"
	if card {
		method = "carte"
	}
	var id, name string
	if err := h.DB.QueryRow(ctx, `INSERT INTO purchases (user_id, item, price, diamonds, method, sandbox) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, (SELECT name FROM users WHERE id = $1)`,
		user, item, price, diamonds, method, test).Scan(&id, &name); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	back := h.Site + "/?achat=" + id
	description := "Babiland Boss · " + label
	var url, ref string
	var err error
	if card {
		var s Session
		s, err = h.Card.Create(ctx, NewSession{Amount: price, Name: description, SuccessURL: back, BackURL: back + "&echec=1", Metadata: map[string]string{"purchase": id}})
		url, ref = s.URL, s.ID
	} else {
		total, op := price, ""
		if o, ok := FindOperator(req.Operator); ok {
			total, op = price+o.Fee(price), o.ID
			description += fmt.Sprintf(" + %d F de frais %s", o.Fee(price), o.Label)
		}
		np := NewPayment{Amount: total, Currency: "XOF", Description: description, PaymentMethod: op, SuccessURL: back, ErrorURL: back + "&echec=1",
			Customer: &Customer{Name: name}, Metadata: map[string]string{"purchase": id}}
		if h.API != "" {
			np.WebhookURL = h.API + "/api/v1/shop/geniuspay"
		}
		var p Payment
		p, err = h.Pay.Create(ctx, np)
		if err != nil && op != "" { // an operator not taken that way: GeniusPay's page, where the player chooses
			np.PaymentMethod = ""
			p, err = h.Pay.Create(ctx, np)
		}
		url, ref = p.URL(), p.Reference
	}
	if err != nil || url == "" {
		log.Printf("shop: payment not opened for %s (%s): %v", id, label, err)
		_, _ = h.DB.Exec(ctx, `UPDATE purchases SET status = 'error' WHERE id = $1`, id)
		httpx.Error(w, http.StatusBadGateway, "le paiement ne répond pas : réessaie dans un instant")
		return
	}
	_, _ = h.DB.Exec(ctx, `UPDATE purchases SET ref = $2, status = 'pending' WHERE id = $1`, id, ref)
	httpx.JSON(w, http.StatusOK, map[string]string{"id": id, "url": url})
}

// Purchase: as the phone sees it.
type Purchase struct {
	ID       string `json:"id"`
	Item     string `json:"item"`
	Price    int    `json:"price"`
	Diamonds int    `json:"diamonds"`
	Status   string `json:"status"`
	Credited bool   `json:"credited"`
}

// check: back from the payment page: the purchase as the payment service says it now.
func (h *Handler) check(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var p Purchase
	var ref *string
	err := h.DB.QueryRow(ctx, `SELECT id, item, price, diamonds, status, credited_at IS NOT NULL, ref FROM purchases WHERE id = $1 AND user_id = $2`, chi.URLParam(r, "id"), auth.UserID(ctx)).
		Scan(&p.ID, &p.Item, &p.Price, &p.Diamonds, &p.Status, &p.Credited, &ref)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "achat introuvable")
		return
	}
	if !p.Credited && ref != nil && p.Status == "pending" {
		if p.Status, p.Credited, err = h.settle(ctx, p.ID, *ref); err != nil {
			log.Printf("shop: check %s: %v", p.ID, err)
		}
	}
	httpx.JSON(w, http.StatusOK, p)
}

func paid(status string) bool {
	switch strings.ToLower(status) {
	case "completed", "complete", "success", "successful", "succeeded", "paid", "approved", "validated":
		return true
	}
	return false
}

// settle asks the payment service how it stands and, paid the right sum, gives what was bought (once).
func (h *Handler) settle(ctx context.Context, id, ref string) (string, bool, error) {
	if strings.HasPrefix(ref, "cs_") {
		if h.Card == nil {
			return "pending", false, errShut
		}
		s, err := h.Card.Get(ctx, ref)
		if err != nil {
			return "pending", false, err
		}
		if s.Status == "expired" {
			_, _ = h.DB.Exec(ctx, `UPDATE purchases SET status = 'expired' WHERE id = $1 AND credited_at IS NULL`, id)
			return "expired", false, nil
		}
		if !s.Paid() {
			return "pending", false, nil
		}
		return h.credit(ctx, id, func(price int) bool { return s.AmountTotal >= price && strings.EqualFold(s.Currency, "xof") && (s.Livemode || h.Card.Test()) })
	}
	if h.Pay == nil {
		return "pending", false, errShut
	}
	p, err := h.Pay.Get(ctx, ref)
	if err != nil {
		return "pending", false, err
	}
	return h.settleGenius(ctx, id, p)
}

func (h *Handler) settleGenius(ctx context.Context, id string, p Payment) (string, bool, error) {
	st := strings.ToLower(p.Status)
	if paid(st) {
		return h.credit(ctx, id, func(price int) bool {
			// fees may come on top of the price, never off it; a test payment never counts while selling for real
			return (p.Amount == 0 || int(math.Round(float64(p.Amount))) >= price) && (p.Currency == "" || strings.EqualFold(p.Currency, "XOF")) && (h.Pay.Sandbox() || !strings.EqualFold(p.Environment, "sandbox"))
		})
	}
	if st == "failed" || st == "expired" || st == "cancelled" {
		_, _ = h.DB.Exec(ctx, `UPDATE purchases SET status = $2 WHERE id = $1 AND credited_at IS NULL`, id, st)
		return st, false, nil
	}
	return "pending", false, nil
}

// credit: what was bought given, once (credited_at), if what was paid matches what was sold.
func (h *Handler) credit(ctx context.Context, id string, sold func(price int) bool) (string, bool, error) {
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		return "pending", false, err
	}
	defer tx.Rollback(ctx)
	var user, item string
	var price, diamonds int
	var done bool
	if err := tx.QueryRow(ctx, `SELECT user_id, item, price, diamonds, credited_at IS NOT NULL FROM purchases WHERE id = $1 FOR UPDATE`, id).Scan(&user, &item, &price, &diamonds, &done); err != nil {
		return "pending", false, err
	}
	if done {
		return "completed", true, nil
	}
	if !sold(price) {
		_, _ = tx.Exec(ctx, `UPDATE purchases SET status = 'mismatch' WHERE id = $1`, id)
		return "mismatch", false, tx.Commit(ctx)
	}
	if item == "pass" {
		_, err = tx.Exec(ctx, `UPDATE users SET pass_until = greatest(coalesce(pass_until, now()), now()) + make_interval(days => $2) WHERE id = $1`, user, PassDays)
	} else {
		_, err = tx.Exec(ctx, `UPDATE users SET diamonds = diamonds + $2 WHERE id = $1`, user, diamonds)
	}
	if err != nil {
		return "pending", false, err
	}
	if _, err := tx.Exec(ctx, `UPDATE purchases SET status = 'completed', credited_at = now() WHERE id = $1`, id); err != nil {
		return "pending", false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return "pending", false, err
	}
	log.Printf("shop: purchase %s credited (%s, %d F)", id, item, price)
	if h.Changed != nil {
		h.Changed(user)
	}
	return "completed", true, nil
}

// spend: diamonds on a boost. What happens on the server (x2, shield, gros bras) is done here; a bag of money
// or a VIP is told to the phone, which plays it.
func (h *Handler) spend(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := auth.UserID(ctx)
	var req struct {
		Boost string `json:"boost"`
		Place string `json:"place,omitempty"`
		Idx   int    `json:"idx,omitempty"`
		Level int    `json:"level,omitempty"` // the player's level (the size of a bag of money)
	}
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	b, ok := findBoost(req.Boost)
	if !ok {
		httpx.Error(w, http.StatusUnprocessableEntity, "boost inconnu")
		return
	}
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	defer tx.Rollback(ctx)
	var left int
	err = tx.QueryRow(ctx, `UPDATE users SET diamonds = diamonds - $2 WHERE id = $1 AND diamonds >= $2 RETURNING diamonds`, user, b.Diamonds).Scan(&left)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusPaymentRequired, "pas assez de diamants")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	out := map[string]any{"diamonds": left, "boost": b.ID}
	switch b.ID {
	case "x2":
		var until time.Time
		err = tx.QueryRow(ctx, `UPDATE users SET boost_until = greatest(coalesce(boost_until, now()), now()) + interval '30 minutes' WHERE id = $1 RETURNING boost_until`, user).Scan(&until)
		out["boostUntil"] = until
	case "sac":
		lvl := min(max(req.Level, 1), 60)
		out["money"] = 5000 * lvl
	case "bouclier", "grosbras":
		set := `shield_until = greatest(coalesce(shield_until, now()), now()) + interval '8 hours'`
		if b.ID == "grosbras" {
			set = `guards = 3`
		}
		tag, e := tx.Exec(ctx, `UPDATE districts SET `+set+` WHERE place = $1 AND idx = $2 AND owner = $3`, req.Place, req.Idx, user)
		if e == nil && tag.RowsAffected() == 0 {
			httpx.Error(w, http.StatusForbidden, "ce quartier n'est pas à toi")
			return
		}
		err = e
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) geniusHook(w http.ResponseWriter, r *http.Request) {
	if h.Pay == nil {
		httpx.Error(w, http.StatusServiceUnavailable, "off")
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<10))
	if err != nil || !h.Pay.Signed(body, r.Header, time.Now()) {
		httpx.Error(w, http.StatusUnauthorized, "invalid signature")
		return
	}
	var hook struct {
		Event string          `json:"event"`
		Data  json.RawMessage `json:"data"`
	}
	_ = json.Unmarshal(body, &hook)
	said, err := paymentIn(hook.Data)
	if err != nil {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ignored"})
		return
	}
	var id string
	if h.DB.QueryRow(r.Context(), `SELECT id FROM purchases WHERE ref = $1`, said.Reference).Scan(&id) != nil {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "unknown"})
		return
	}
	// a webhook only says « go and look »: GeniusPay is asked itself
	status, _, err := h.settle(r.Context(), id, said.Reference)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, "try again")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": status})
}

func (h *Handler) stripeHook(w http.ResponseWriter, r *http.Request) {
	if h.Card == nil {
		httpx.Error(w, http.StatusServiceUnavailable, "off")
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<10))
	if err != nil || !h.Card.Signed(body, r.Header.Get("Stripe-Signature"), time.Now()) {
		httpx.Error(w, http.StatusUnauthorized, "invalid signature")
		return
	}
	var ev struct {
		Data struct {
			Object struct {
				ID string `json:"id"`
			} `json:"object"`
		} `json:"data"`
	}
	_ = json.Unmarshal(body, &ev)
	var id string
	if h.DB.QueryRow(r.Context(), `SELECT id FROM purchases WHERE ref = $1`, ev.Data.Object.ID).Scan(&id) != nil {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "unknown"})
		return
	}
	status, _, err := h.settle(r.Context(), id, ev.Data.Object.ID)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, "try again")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": status})
}
