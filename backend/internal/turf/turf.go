// Package turf: the districts held by real players (docs/VISION.md, the clash). The first player to betray the
// computer's boss of a place's home district becomes its boss for everybody: the new players who start there work
// for him and send him a share of their sales, until one of them betrays him. A district held by a player is
// attacked in a live duel: the attacker serves customers, the owner (if he is online) serves to defend it; the
// server keeps the score and says who wins. Districts the computer's bosses hold stay played on the phone.
package turf

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/myahse/babiland-boss/backend/internal/auth"
	"github.com/myahse/babiland-boss/backend/internal/httpx"
	"github.com/myahse/babiland-boss/backend/internal/live"
)

//go:embed districts.json
var districtsJSON []byte

type District struct {
	Name string `json:"name"`
	N    []int  `json:"n"`
}

// Districts: every place's districts (from the maps, tools/neighbours.py).
var Districts = map[string][]District{}

func init() {
	if err := json.Unmarshal(districtsJSON, &Districts); err != nil {
		panic(err)
	}
}

const (
	DuelTime  = 60 * time.Second
	Target    = 8                // customers to serve to win
	GuardMore = 2                // each « gros bras » level: 2 more to serve against a player
	Shield    = 3 * time.Minute  // a district just taken can't be attacked for a while
	Cooldown  = 90 * time.Second // after losing a duel
	Cut       = 0.2              // the boss's share of his workers' sales
	// a customer takes at least about a second and a half: faster than that is not played
	MaxRate = 0.8
)

type Handler struct {
	DB  *pgxpool.Pool
	Hub *live.Hub

	mu      sync.Mutex
	lost    map[string]time.Time // user: last duel lost
	tribute map[string]time.Time // user: last share sent
}

func New(db *pgxpool.Pool, hub *live.Hub) *Handler {
	h := &Handler{DB: db, Hub: hub, lost: map[string]time.Time{}, tribute: map[string]time.Time{}}
	hub.Duel = h.score
	return h
}

func (h *Handler) Routes(r chi.Router) {
	r.Get("/turf/{place}", h.view)
	r.Post("/turf/{place}/{idx}/attack", h.attack)
	r.Post("/turf/{place}/{idx}/release", h.release)
	r.Post("/turf/{place}/{idx}/guards", h.guards)
	r.Post("/turf/duel/{id}/end", h.end)
	r.Post("/turf/{place}/tribute", h.sendTribute)
	r.Get("/ranking", h.ranking)
}

// Owner: who holds a district, as the phone shows it.
type Owner struct {
	Idx    int        `json:"idx"`
	ID     string     `json:"id"`
	Name   string     `json:"name"`
	Mine   bool       `json:"mine"`
	Online bool       `json:"online"`
	Guards int        `json:"guards"`
	Shield *time.Time `json:"shieldUntil,omitempty"`
	Since  time.Time  `json:"since"`
}

func place(r *http.Request) (string, []District, bool) {
	p := chi.URLParam(r, "place")
	d, ok := Districts[p]
	return p, d, ok
}

func (h *Handler) owners(ctx context.Context, p, me string) ([]Owner, error) {
	rows, err := h.DB.Query(ctx, `SELECT d.idx, d.owner, u.name, d.guards, d.shield_until, d.since FROM districts d JOIN users u ON u.id = d.owner WHERE d.place = $1 ORDER BY d.idx`, p)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Owner, error) {
		var o Owner
		err := row.Scan(&o.Idx, &o.ID, &o.Name, &o.Guards, &o.Shield, &o.Since)
		o.Mine = o.ID == me
		o.Online = h.Hub.Online(o.ID)
		if o.Shield != nil && o.Shield.Before(time.Now()) {
			o.Shield = nil
		}
		return o, err
	})
	return list, err
}

func (h *Handler) view(w http.ResponseWriter, r *http.Request) {
	p, _, ok := place(r)
	if !ok {
		httpx.Error(w, http.StatusNotFound, "lieu inconnu")
		return
	}
	list, err := h.owners(r.Context(), p, auth.UserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"place": p, "owners": list})
}



// attack: a duel starts for a district (POST /turf/{place}/{idx}/attack).
func (h *Handler) attack(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	me := auth.UserID(ctx)
	p, ds, ok := place(r)
	idx, err := strconv.Atoi(chi.URLParam(r, "idx"))
	if !ok || err != nil || idx < 0 || idx >= len(ds) {
		httpx.Error(w, http.StatusNotFound, "quartier inconnu")
		return
	}
	h.mu.Lock()
	wait := Cooldown - time.Since(h.lost[me])
	h.mu.Unlock()
	if wait > 0 {
		httpx.Error(w, http.StatusTooManyRequests, fmt.Sprintf("repose-toi encore %d s", int(wait.Seconds())+1))
		return
	}
	list, err := h.owners(ctx, p, me)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	var target *Owner
	mine := map[int]bool{}
	for i := range list {
		if list[i].Mine {
			mine[list[i].Idx] = true
		}
		if list[i].Idx == idx {
			target = &list[i]
		}
	}
	if mine[idx] {
		httpx.Error(w, http.StatusConflict, "ce quartier est déjà à toi")
		return
	}
	// your own district first (betray its boss), then only the districts touching yours
	if idx != 0 && (!mine[0] || !slices.ContainsFunc(ds[idx].N, func(j int) bool { return mine[j] })) {
		httpx.Error(w, http.StatusForbidden, "attaque seulement un quartier qui touche les tiens")
		return
	}
	if target != nil && target.Shield != nil {
		httpx.Error(w, http.StatusConflict, fmt.Sprintf("%s est protégé encore %d min", ds[idx].Name, int(time.Until(*target.Shield).Minutes())+1))
		return
	}
	var busy bool
	_ = h.DB.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM duels WHERE place = $1 AND idx = $2 AND result IS NULL AND ends_at > now() - interval '10 seconds')`, p, idx).Scan(&busy)
	if busy {
		httpx.Error(w, http.StatusConflict, "un duel est déjà en cours pour ce quartier")
		return
	}
	var defender *string
	need := Target
	if target != nil {
		defender = &target.ID
		need += GuardMore * target.Guards
	}
	var id string
	var name string
	if err := h.DB.QueryRow(ctx, `INSERT INTO duels (place, idx, attacker, defender, ends_at) VALUES ($1, $2, $3, $4, now() + $5::interval) RETURNING id, (SELECT name FROM users WHERE id = $3)`,
		p, idx, me, defender, fmt.Sprintf("%d seconds", int(DuelTime.Seconds()))).Scan(&id, &name); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	out := map[string]any{"duel": id, "target": need, "seconds": int(DuelTime.Seconds())}
	if target != nil {
		out["defender"] = target.Name
		out["online"] = target.Online
		// the owner is told at once, wherever he is in the game: he can come and defend
		h.Hub.ToUser(target.ID, live.Msg{"t": "attack", "duel": id, "place": p, "idx": idx, "district": ds[idx].Name, "by": name, "target": need, "seconds": int(DuelTime.Seconds())})
	}
	h.Hub.ToPlace(p, live.Msg{"t": "news", "text": fmt.Sprintf("⚔️ %s attaque %s !", name, ds[idx].Name)})
	httpx.JSON(w, http.StatusOK, out)
}

// score: a player's count in a duel, from the live connection.
func (h *Handler) score(ctx context.Context, user, duel string, n int) {
	var attacker string
	var defender *string
	var started, ends time.Time
	var attack, defence int
	if err := h.DB.QueryRow(ctx, `SELECT attacker, defender, started_at, ends_at, attack, defence FROM duels WHERE id = $1 AND result IS NULL`, duel).Scan(&attacker, &defender, &started, &ends, &attack, &defence); err != nil {
		return
	}
	if time.Now().After(ends.Add(3 * time.Second)) {
		return
	}
	// never faster than customers can really be served
	limit := int(time.Since(started).Seconds()*MaxRate) + 2
	n = min(n, limit)
	switch {
	case user == attacker && n > attack:
		attack = n
		_, _ = h.DB.Exec(ctx, `UPDATE duels SET attack = $2 WHERE id = $1`, duel, n)
	case defender != nil && user == *defender && n > defence:
		defence = n
		_, _ = h.DB.Exec(ctx, `UPDATE duels SET defence = $2 WHERE id = $1`, duel, n)
	default:
		return
	}
	m := live.Msg{"t": "duel", "duel": duel, "attack": attack, "defence": defence, "left": int(time.Until(ends).Seconds())}
	h.Hub.ToUser(attacker, m)
	if defender != nil {
		h.Hub.ToUser(*defender, m)
	}
	// the owner defending live reached the target first: he holds his district, the duel is over
	if defender != nil && user == *defender && defence >= h.need(ctx, duel) && defence > attack {
		h.repel(ctx, duel)
	}
}

// need: what the attacker must serve in a duel (more against a boss with gros bras).
func (h *Handler) need(ctx context.Context, duel string) int {
	var guards int
	_ = h.DB.QueryRow(ctx, `SELECT coalesce(t.guards, 0) FROM duels d LEFT JOIN districts t ON t.place = d.place AND t.idx = d.idx AND t.owner = d.defender WHERE d.id = $1`, duel).Scan(&guards)
	return Target + GuardMore*guards
}

// repel: the defender won the duel before the attacker.
func (h *Handler) repel(ctx context.Context, duel string) {
	var p, attacker, defender, by, boss string
	var idx int
	err := h.DB.QueryRow(ctx, `UPDATE duels d SET result = 'lost' WHERE d.id = $1 AND d.result IS NULL
		RETURNING d.place, d.idx, d.attacker, d.defender, (SELECT name FROM users WHERE id = d.attacker), (SELECT name FROM users WHERE id = d.defender)`, duel).Scan(&p, &idx, &attacker, &defender, &by, &boss)
	if err != nil {
		return
	}
	h.mu.Lock()
	h.lost[attacker] = time.Now()
	h.mu.Unlock()
	dn := Districts[p][idx].Name
	h.Hub.ToUser(attacker, live.Msg{"t": "repelled", "duel": duel, "place": p, "idx": idx, "district": dn, "by": boss})
	h.Hub.ToUser(defender, live.Msg{"t": "held", "place": p, "idx": idx, "district": dn, "by": by})
	h.Hub.ToPlace(p, live.Msg{"t": "news", "text": fmt.Sprintf("🛡️ %s a tenu %s face à %s", boss, dn, by)})
}

// end: the attacker says the duel is over (he reached the target, or the time ran out); the server decides.
func (h *Handler) end(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	me := auth.UserID(ctx)
	var req struct {
		Attack int `json:"attack"`
	}
	_ = httpx.Decode(r, &req)
	id := chi.URLParam(r, "id")
	var p, name string
	var idx, attack, defence, guards int
	var defender *string
	var started, ends time.Time
	err := h.DB.QueryRow(ctx, `SELECT d.place, d.idx, d.defender, d.started_at, d.ends_at, d.attack, d.defence, coalesce(t.guards, 0), u.name
		FROM duels d JOIN users u ON u.id = d.attacker LEFT JOIN districts t ON t.place = d.place AND t.idx = d.idx AND t.owner = d.defender
		WHERE d.id = $1 AND d.attacker = $2 AND d.result IS NULL`, id, me).Scan(&p, &idx, &defender, &started, &ends, &attack, &defence, &guards, &name)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "duel introuvable ou déjà fini")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	limit := int(time.Since(started).Seconds()*MaxRate) + 2
	attack = max(attack, min(req.Attack, limit))
	need := Target
	if defender != nil {
		need += GuardMore * guards
	}
	// against a real boss who defended: serve more than him too
	won := attack >= need && (defender == nil || attack > defence)
	if !won && time.Now().Before(ends) && attack < need {
		httpx.Error(w, http.StatusConflict, "le duel n'est pas fini")
		return
	}
	result := "lost"
	if won {
		result = "won"
	}
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	defer tx.Rollback(ctx)
	if tag, err := tx.Exec(ctx, `UPDATE duels SET result = $2, attack = $3 WHERE id = $1 AND result IS NULL`, id, result, attack); err != nil || tag.RowsAffected() != 1 {
		httpx.Error(w, http.StatusConflict, "duel déjà fini")
		return
	}
	if won {
		if _, err := tx.Exec(ctx, `INSERT INTO districts (place, idx, owner, shield_until) VALUES ($1, $2, $3, now() + $4::interval)
			ON CONFLICT (place, idx) DO UPDATE SET owner = $3, since = now(), shield_until = now() + $4::interval, guards = 0`, p, idx, me, fmt.Sprintf("%d seconds", int(Shield.Seconds()))); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	dn := Districts[p][idx].Name
	if won {
		h.Hub.ToPlace(p, live.Msg{"t": "news", "text": fmt.Sprintf("👑 %s prend %s !", name, dn)})
		if defender != nil {
			h.Hub.ToUser(*defender, live.Msg{"t": "lost", "place": p, "idx": idx, "district": dn, "by": name})
		}
	} else {
		h.mu.Lock()
		h.lost[me] = time.Now()
		h.mu.Unlock()
		if defender != nil {
			h.Hub.ToUser(*defender, live.Msg{"t": "held", "place": p, "idx": idx, "district": dn, "by": name})
			var boss string
			_ = h.DB.QueryRow(ctx, `SELECT name FROM users WHERE id = $1`, *defender).Scan(&boss)
			h.Hub.ToPlace(p, live.Msg{"t": "news", "text": fmt.Sprintf("🛡️ %s a tenu %s face à %s", boss, dn, name)})
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"won": won, "attack": attack, "defence": defence, "target": need})
}

// release: the computer's boss took back one of your districts (a counter-attack played on the phone).
func (h *Handler) release(w http.ResponseWriter, r *http.Request) {
	p, ds, ok := place(r)
	idx, err := strconv.Atoi(chi.URLParam(r, "idx"))
	if !ok || err != nil || idx < 0 || idx >= len(ds) {
		httpx.Error(w, http.StatusNotFound, "quartier inconnu")
		return
	}
	_, _ = h.DB.Exec(r.Context(), `DELETE FROM districts WHERE place = $1 AND idx = $2 AND owner = $3`, p, idx, auth.UserID(r.Context()))
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// guards: the « gros bras » of one of your districts (paid in the game's money, on the phone).
func (h *Handler) guards(w http.ResponseWriter, r *http.Request) {
	p, ds, ok := place(r)
	idx, err := strconv.Atoi(chi.URLParam(r, "idx"))
	var req struct {
		Level int `json:"level"`
	}
	if !ok || err != nil || idx < 0 || idx >= len(ds) || httpx.Decode(r, &req) != nil || req.Level < 0 || req.Level > 3 {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	tag, err := h.DB.Exec(r.Context(), `UPDATE districts SET guards = greatest(guards, $4) WHERE place = $1 AND idx = $2 AND owner = $3`, p, idx, auth.UserID(r.Context()), req.Level)
	if err != nil || tag.RowsAffected() == 0 {
		httpx.Error(w, http.StatusForbidden, "ce quartier n'est pas à toi")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// sendTribute: a worker's sales in a place whose home district a player holds: his share goes to that boss.
func (h *Handler) sendTribute(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	me := auth.UserID(ctx)
	p, _, ok := place(r)
	var req struct {
		Amount int `json:"amount"`
	}
	if !ok || httpx.Decode(r, &req) != nil || req.Amount <= 0 {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	h.mu.Lock()
	since := time.Since(h.tribute[me])
	if since < 20*time.Second {
		h.mu.Unlock()
		httpx.Error(w, http.StatusTooManyRequests, "trop souvent")
		return
	}
	h.tribute[me] = time.Now()
	h.mu.Unlock()
	// at most what a busy maquis sells in that time
	amount := min(req.Amount, int(min(since.Seconds(), 600)*60))
	var boss, name string
	err := h.DB.QueryRow(ctx, `UPDATE users SET tribute = tribute + $3 WHERE id = (SELECT owner FROM districts WHERE place = $1 AND idx = 0 AND owner <> $2) RETURNING id, name`, p, me, amount).Scan(&boss, &name)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.JSON(w, http.StatusOK, map[string]any{"boss": nil})
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	h.Hub.ToUser(boss, live.Msg{"t": "tribute", "amount": amount, "place": p})
	httpx.JSON(w, http.StatusOK, map[string]any{"boss": name, "amount": amount})
}

// ranking: the biggest bosses (districts held, then fame).
func (h *Handler) ranking(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), `SELECT u.name, count(d.idx), u.fame, (u.pass_until > now()) IS TRUE FROM users u LEFT JOIN districts d ON d.owner = u.id
		GROUP BY u.id ORDER BY count(d.idx) DESC, u.fame DESC LIMIT 30`)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	type row struct {
		Name      string `json:"name"`
		Districts int    `json:"districts"`
		Fame      int    `json:"fame"`
		Pass      bool   `json:"pass"`
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (row, error) {
		var x row
		return x, r.Scan(&x.Name, &x.Districts, &x.Fame, &x.Pass)
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	httpx.JSON(w, http.StatusOK, list)
}


