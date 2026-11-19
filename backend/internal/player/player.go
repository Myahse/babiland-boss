// Package player: the signed-in boss — his profile (what only the server keeps: diamonds, Pass, boost, the
// share his workers sent him), his game saved online (to play on another phone), what he picks up.
package player

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/myahse/babiland-boss/backend/internal/auth"
	"github.com/myahse/babiland-boss/backend/internal/httpx"
)

type Handler struct{ DB *pgxpool.Pool }

func (h *Handler) Routes(r chi.Router) {
	r.Get("/me", h.me)
	r.Get("/me/save", h.load)
	r.Put("/me/save", h.store)
	r.Post("/me/tribute", h.collect)
}

type Me struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Diamonds  int        `json:"diamonds"`
	PassUntil *time.Time `json:"passUntil,omitempty"`
	Boost     *time.Time `json:"boostUntil,omitempty"`
	Tribute   int64      `json:"tribute"`
	SaveAt    *time.Time `json:"saveAt,omitempty"`
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	var m Me
	err := h.DB.QueryRow(r.Context(), `UPDATE users SET seen_at = now() WHERE id = $1 RETURNING id, name, diamonds, pass_until, boost_until, tribute, save_at`, auth.UserID(r.Context())).
		Scan(&m.ID, &m.Name, &m.Diamonds, &m.PassUntil, &m.Boost, &m.Tribute, &m.SaveAt)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "compte introuvable")
		return
	}
	now := time.Now()
	if m.PassUntil != nil && m.PassUntil.Before(now) {
		m.PassUntil = nil
	}
	if m.Boost != nil && m.Boost.Before(now) {
		m.Boost = nil
	}
	httpx.JSON(w, http.StatusOK, m)
}

func (h *Handler) load(w http.ResponseWriter, r *http.Request) {
	var save []byte
	var at *time.Time
	if err := h.DB.QueryRow(r.Context(), `SELECT save, save_at FROM users WHERE id = $1`, auth.UserID(r.Context())).Scan(&save, &at); err != nil {
		httpx.Error(w, http.StatusNotFound, "compte introuvable")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"save": json.RawMessage(nonNull(save)), "at": at})
}

func nonNull(b []byte) []byte {
	if len(b) == 0 {
		return []byte("null")
	}
	return b
}

// store: the game as the phone keeps it (a JSON object, 256 KB at most), and the fame for the ranking.
func (h *Handler) store(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Save json.RawMessage `json:"save"`
		Fame int             `json:"fame"`
	}
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 256<<10))
	if err := dec.Decode(&req); err != nil || len(req.Save) == 0 || req.Save[0] != '{' {
		httpx.Error(w, http.StatusBadRequest, "sauvegarde invalide")
		return
	}
	if _, err := h.DB.Exec(r.Context(), `UPDATE users SET save = $2, save_at = now(), fame = least($3, 100000) WHERE id = $1`, auth.UserID(r.Context()), []byte(req.Save), max(req.Fame, 0)); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// collect: the share your workers sent you, picked up (it goes into your money on the phone).
func (h *Handler) collect(w http.ResponseWriter, r *http.Request) {
	var amount int64
	err := h.DB.QueryRow(r.Context(), `UPDATE users u SET tribute = 0 FROM (SELECT tribute FROM users WHERE id = $1 FOR UPDATE) old WHERE u.id = $1 RETURNING old.tribute`, auth.UserID(r.Context())).Scan(&amount)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]int64{"amount": amount})
}
