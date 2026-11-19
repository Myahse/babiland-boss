// Package auth: accounts (a boss name and a password) and the tokens the phone sends with each request.
package auth

import (
	"context"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/myahse/babiland-boss/backend/internal/httpx"
)

const ttl = 60 * 24 * time.Hour

type Tokens struct{ secret []byte }

func NewTokens(secret string) Tokens { return Tokens{secret: []byte(secret)} }

func (t Tokens) Issue(userID string) (string, error) {
	now := time.Now()
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{Subject: userID, IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(ttl))}).SignedString(t.secret)
}

// Parse: the user of a valid token.
func (t Tokens) Parse(token string) (string, error) {
	var c jwt.RegisteredClaims
	if _, err := jwt.ParseWithClaims(token, &c, func(*jwt.Token) (any, error) { return t.secret, nil }, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired()); err != nil {
		return "", err
	}
	if c.Subject == "" {
		return "", errors.New("no subject")
	}
	return c.Subject, nil
}

type ctxKey struct{}

// Require: only signed-in players (Authorization: Bearer <token>); the user id in the context.
func (t Tokens) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		id, err := t.Parse(raw)
		if !ok || err != nil {
			httpx.Error(w, http.StatusUnauthorized, "connecte-toi d'abord")
			return
		}
		next.ServeHTTP(w, r.WithContext(WithUser(r.Context(), id)))
	})
}

func WithUser(ctx context.Context, id string) context.Context { return context.WithValue(ctx, ctxKey{}, id) }
func UserID(ctx context.Context) string {
	id, _ := ctx.Value(ctxKey{}).(string)
	return id
}

type Handler struct {
	DB     *pgxpool.Pool
	Tokens Tokens
}

// Routes: not signed in.
func (h *Handler) Routes(r chi.Router) {
	r.Post("/auth/register", h.register)
	r.Post("/auth/login", h.login)
}

var nameOK = regexp.MustCompile(`^[\p{L}\p{N}][\p{L}\p{N} '_.-]{1,18}[\p{L}\p{N}]$`)

type creds struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}

type session struct {
	Token string `json:"token"`
	ID    string `json:"id"`
	Name  string `json:"name"`
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var c creds
	if err := httpx.Decode(r, &c); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	c.Name = strings.Join(strings.Fields(c.Name), " ")
	if !nameOK.MatchString(c.Name) {
		httpx.Error(w, http.StatusUnprocessableEntity, "ton nom de boss : 3 à 20 lettres ou chiffres")
		return
	}
	if len(c.Password) < 6 || len(c.Password) > 72 {
		httpx.Error(w, http.StatusUnprocessableEntity, "le mot de passe : 6 caractères au moins")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "réessaie")
		return
	}
	var id string
	err = h.DB.QueryRow(r.Context(), `INSERT INTO users (name, name_key, password) VALUES ($1, $2, $3) RETURNING id`, c.Name, strings.ToLower(c.Name), string(hash)).Scan(&id)
	var pg *pgconn.PgError
	if errors.As(err, &pg) && pg.Code == "23505" {
		httpx.Error(w, http.StatusConflict, "ce nom de boss est déjà pris")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	h.issue(w, id, c.Name)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var c creds
	if err := httpx.Decode(r, &c); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	var id, name, hash string
	err := h.DB.QueryRow(r.Context(), `SELECT id, name, password FROM users WHERE name_key = $1`, strings.ToLower(strings.Join(strings.Fields(c.Name), " "))).Scan(&id, &name, &hash)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && bcrypt.CompareHashAndPassword([]byte(hash), []byte(c.Password)) != nil) {
		httpx.Error(w, http.StatusUnauthorized, "nom ou mot de passe faux")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "base de données indisponible")
		return
	}
	h.issue(w, id, name)
}

func (h *Handler) issue(w http.ResponseWriter, id, name string) {
	tok, err := h.Tokens.Issue(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "réessaie")
		return
	}
	httpx.JSON(w, http.StatusOK, session{Token: tok, ID: id, Name: name})
}
