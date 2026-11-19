package shop

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/myahse/babiland-boss/backend/internal/auth"
	"github.com/myahse/babiland-boss/backend/internal/db"
)

// A fake GeniusPay: payments created, then said paid (or paid less) when the test wants.
type fakePay struct {
	mu     sync.Mutex
	status map[string]string
	amount map[string]float64
	n      int
}

func (f *fakePay) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if r.Method == http.MethodPost {
		var p NewPayment
		_ = json.NewDecoder(r.Body).Decode(&p)
		f.n++
		ref := "MTX" + string(rune('A'+f.n))
		f.status[ref], f.amount[ref] = "pending", float64(p.Amount)
		_ = json.NewEncoder(w).Encode(map[string]any{"success": true, "data": map[string]any{"reference": ref, "amount": p.Amount, "currency": "XOF", "status": "pending", "checkout_url": "https://pay.test/" + ref}})
		return
	}
	ref := r.URL.Path[strings.LastIndex(r.URL.Path, "/")+1:]
	_ = json.NewEncoder(w).Encode(map[string]any{"success": true, "data": map[string]any{"reference": ref, "amount": f.amount[ref], "currency": "XOF", "status": f.status[ref]}})
}

func setup(t *testing.T) (*pgxpool.Pool, *Handler, *fakePay, string) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	pool, err := db.Connect(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Migrate(ctx, pool); err != nil {
		t.Fatal(err)
	}
	f := &fakePay{status: map[string]string{}, amount: map[string]float64{}}
	srv := httptest.NewServer(f)
	t.Cleanup(srv.Close)
	h := &Handler{DB: pool, Pay: &GeniusPay{Key: "pk_live_x", Secret: "sk_live_x", Base: srv.URL, Client: srv.Client()}, Site: "https://jeu.test"}
	var user string
	name := "test" + time.Now().Format("150405.000000")
	if err := pool.QueryRow(ctx, `INSERT INTO users (name, name_key, password) VALUES ($1, $1, 'x') RETURNING id`, name).Scan(&user); err != nil {
		t.Fatal(err)
	}
	return pool, h, f, user
}

func do(h *Handler, user, method, path string, body any) (int, map[string]any) {
	r := chi.NewRouter()
	r.Group(func(r chi.Router) {
		r.Use(func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) { next.ServeHTTP(w, req.WithContext(auth.WithUser(req.Context(), user))) })
		})
		h.Routes(r)
	})
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(method, path, bytes.NewReader(b)))
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestBuyCreditedOnce(t *testing.T) {
	pool, h, f, user := setup(t)
	code, out := do(h, user, "POST", "/shop/buy", map[string]any{"pack": "panier", "method": "mobile", "operator": "wave"})
	if code != 200 || !strings.HasPrefix(out["url"].(string), "https://pay.test/") {
		t.Fatalf("buy: %d %v", code, out)
	}
	id := out["id"].(string)
	// not paid yet: nothing given
	if _, out = do(h, user, "POST", "/shop/purchase/"+id, nil); out["credited"] == true {
		t.Fatal("credited before being paid")
	}
	for ref := range f.status {
		f.status[ref] = "completed"
	}
	_, out = do(h, user, "POST", "/shop/purchase/"+id, nil)
	if out["credited"] != true {
		t.Fatalf("not credited once paid: %v", out)
	}
	// asked again (the webhook, the player coming back): given only once
	do(h, user, "POST", "/shop/purchase/"+id, nil)
	var diamonds int
	_ = pool.QueryRow(context.Background(), `SELECT diamonds FROM users WHERE id = $1`, user).Scan(&diamonds)
	if diamonds != 300 {
		t.Fatalf("diamonds = %d, want 300 (credited once)", diamonds)
	}
	// spending: enough, then not enough
	if c, o := do(h, user, "POST", "/shop/spend", map[string]any{"boost": "x2"}); c != 200 || o["diamonds"].(float64) != 270 {
		t.Fatalf("spend: %d %v", c, o)
	}
	for range 9 {
		do(h, user, "POST", "/shop/spend", map[string]any{"boost": "x2"})
	}
	if c, _ := do(h, user, "POST", "/shop/spend", map[string]any{"boost": "x2"}); c != http.StatusPaymentRequired {
		t.Fatalf("spent more diamonds than held: %d", c)
	}
}

func TestPaidLessNotCredited(t *testing.T) {
	pool, h, f, user := setup(t)
	_, out := do(h, user, "POST", "/shop/buy", map[string]any{"pack": "camion", "method": "mobile"})
	id := out["id"].(string)
	for ref := range f.status {
		f.status[ref], f.amount[ref] = "completed", 100
	}
	_, out = do(h, user, "POST", "/shop/purchase/"+id, nil)
	if out["credited"] == true || out["status"] != "mismatch" {
		t.Fatalf("a payment of 100 F credited 10 000 F of diamonds: %v", out)
	}
	var diamonds int
	_ = pool.QueryRow(context.Background(), `SELECT diamonds FROM users WHERE id = $1`, user).Scan(&diamonds)
	if diamonds != 0 {
		t.Fatalf("diamonds = %d", diamonds)
	}
}

func TestSandboxOnlyForTesters(t *testing.T) {
	_, h, _, user := setup(t)
	h.Pay.Key = "pk_sandbox_x"
	if c, _ := do(h, user, "POST", "/shop/buy", map[string]any{"pack": "sachet", "method": "mobile"}); c != http.StatusServiceUnavailable {
		t.Fatalf("test keys sold to a player: %d", c)
	}
}
