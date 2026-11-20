package auth

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"

	"github.com/myahse/babiland-boss/backend/internal/db"
)

// A fake Google: its own signing key, published like Google's, and ID tokens signed with it.
func fakeGoogle(t *testing.T) (*GoogleVerifier, func(sub, email, given string, verified bool) string) {
	key, _ := rsa.GenerateKey(rand.Reader, 2048)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kid": "k1", "n": base64.RawURLEncoding.EncodeToString(key.N.Bytes()), "e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes()),
		}}})
	}))
	t.Cleanup(srv.Close)
	v := NewGoogleVerifier("client-babiland")
	v.keys = newKeySet(srv.URL)
	sign := func(sub, email, given string, verified bool) string {
		tok := jwt.NewWithClaims(jwt.SigningMethodRS256, googleClaims{Email: email, EmailVerified: verified, GivenName: given, Name: given + " Kone",
			RegisteredClaims: jwt.RegisteredClaims{Subject: sub, Issuer: "https://accounts.google.com", Audience: jwt.ClaimStrings{"client-babiland"}, ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}})
		tok.Header["kid"] = "k1"
		s, _ := tok.SignedString(key)
		return s
	}
	return v, sign
}

func TestGoogleSignIn(t *testing.T) {
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
	v, sign := fakeGoogle(t)
	h := &Handler{DB: pool, Tokens: NewTokens("test-secret-0123456789"), Google: v}
	r := chi.NewRouter()
	h.Routes(r)
	post := func(path string, body any) (int, map[string]any) {
		b, _ := json.Marshal(body)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("POST", path, bytes.NewReader(b)))
		var out map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		return w.Code, out
	}
	sub := "g-" + time.Now().Format("150405.000000")
	name := "Awa" + time.Now().Format("150405")
	cred := sign(sub, "awa@example.com", "Awa", true)

	// a new Google account: asked for a boss name, with a suggestion
	code, out := post("/auth/google", map[string]any{"credential": cred})
	if code != http.StatusConflict || out["needName"] != true || out["suggestion"] != "Awa" {
		t.Fatalf("new account: %d %v", code, out)
	}
	// with a name: signed in
	code, out = post("/auth/google", map[string]any{"credential": cred, "name": name})
	if code != 200 || out["token"] == "" || out["name"] != name {
		t.Fatalf("with a name: %d %v", code, out)
	}
	id := out["id"]
	// next time: the same boss straight away
	code, out = post("/auth/google", map[string]any{"credential": sign(sub, "awa@example.com", "Awa", true)})
	if code != 200 || out["id"] != id {
		t.Fatalf("again: %d %v", code, out)
	}
	// another Google account can't take the same boss name
	if code, out = post("/auth/google", map[string]any{"credential": sign(sub+"x", "b@example.com", "B", true), "name": name}); code != http.StatusConflict {
		t.Fatalf("name taken: %d %v", code, out)
	}
	// a token Google didn't sign, or an e-mail not verified: refused
	if code, _ = post("/auth/google", map[string]any{"credential": cred[:len(cred)-4] + "AAAA"}); code != http.StatusUnauthorized {
		t.Fatalf("forged token accepted: %d", code)
	}
	if code, _ = post("/auth/google", map[string]any{"credential": sign(sub+"y", "c@example.com", "C", false)}); code != http.StatusUnauthorized {
		t.Fatalf("unverified e-mail accepted: %d", code)
	}
	// a Google boss has no password: the password form never opens it
	if code, _ = post("/auth/login", map[string]any{"name": name, "password": ""}); code != http.StatusUnauthorized {
		t.Fatalf("password login on a Google account: %d", code)
	}
}
