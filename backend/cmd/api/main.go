// The Babiland Boss API: accounts, the game saved online, the districts held by real players and their live
// duels, the boss's share, the ranking, and the shop (GeniusPay / Stripe). Configured by the environment
// (see backend/README.md); DATABASE_URL is a Postgres (Neon in production).
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"github.com/myahse/babiland-boss/backend/internal/auth"
	"github.com/myahse/babiland-boss/backend/internal/db"
	"github.com/myahse/babiland-boss/backend/internal/live"
	"github.com/myahse/babiland-boss/backend/internal/player"
	"github.com/myahse/babiland-boss/backend/internal/shop"
	"github.com/myahse/babiland-boss/backend/internal/turf"
)

func main() {
	_ = godotenv.Load()
	ctx := context.Background()
	url := os.Getenv("DATABASE_URL")
	secret := os.Getenv("JWT_SECRET")
	if url == "" || len(secret) < 16 {
		log.Fatal("DATABASE_URL and JWT_SECRET (16 characters at least) must be set")
	}
	pool, err := db.Connect(ctx, url)
	if err != nil {
		log.Fatal(err)
	}
	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatal(err)
	}
	tokens := auth.NewTokens(secret)
	hub := live.NewHub(tokens)
	tf := turf.New(pool, hub)
	sh := &shop.Handler{DB: pool, Pay: shop.FromEnv(), Card: shop.StripeFromEnv(), Site: strings.TrimRight(os.Getenv("SITE_URL"), "/"), API: strings.TrimRight(os.Getenv("API_URL"), "/"),
		Changed: func(user string) { hub.ToUser(user, live.Msg{"t": "me"}) }}
	log.Printf("shop: Mobile Money %v, card %v", sh.Pay != nil, sh.Card != nil)

	r := chi.NewRouter()
	r.Use(middleware.RealIP, middleware.Recoverer, middleware.Timeout(30*time.Second))
	origins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
	if os.Getenv("ALLOWED_ORIGINS") == "" {
		origins = []string{"http://localhost:5173", "http://127.0.0.1:5173"}
	}
	r.Use(cors.Handler(cors.Options{AllowedOrigins: origins, AllowedMethods: []string{"GET", "POST", "PUT", "OPTIONS"}, AllowedHeaders: []string{"Authorization", "Content-Type"}, MaxAge: 600}))
	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("ok")) })
	r.Route("/api/v1", func(r chi.Router) {
		(&auth.Handler{DB: pool, Tokens: tokens}).Routes(r)
		sh.Hooks(r)
		r.Get("/live", hub.Serve)
		r.Group(func(r chi.Router) {
			r.Use(tokens.Require)
			(&player.Handler{DB: pool}).Routes(r)
			tf.Routes(r)
			sh.Routes(r)
		})
	})
	addr := ":" + envOr("PORT", "8080")
	log.Printf("babiland-boss api on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
