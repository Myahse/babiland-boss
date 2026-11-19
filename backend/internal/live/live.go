// Package live keeps the bosses of a place in touch, over a WebSocket: who is online there, what happens to
// the districts (an attack, a conquest), the score of a duel while it goes on, and quick shout-outs.
// The hub lives in this process's memory: run one API instance.
package live

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"slices"
	"sync"
	"time"

	"github.com/coder/websocket"

	"github.com/myahse/babiland-boss/backend/internal/auth"
)

// Msg: what goes over the wire, one JSON object: its type in « t », the rest as it comes.
type Msg map[string]any

type client struct {
	user, name, place string
	out               chan []byte
}

type Hub struct {
	Tokens auth.Tokens
	// Duel: a player's score in a duel he is in (turf decides what it means).
	Duel func(ctx context.Context, user, duel string, score int)

	mu      sync.Mutex
	clients map[*client]bool
}

func NewHub(t auth.Tokens) *Hub { return &Hub{Tokens: t, clients: map[*client]bool{}} }

// Quick shout-outs (no free text: nothing to moderate).
var Shouts = []string{"🔥 Mon garba est le meilleur !", "😎 Je suis le boss ici", "⚔️ Je viens pour ton quartier", "🛡️ Viens si tu es fort", "🤝 Bien joué", "😂 Doucement !", "👑 Respect au boss", "🍛 Venez manger chez moi"}

func (h *Hub) send(c *client, m Msg) {
	b, _ := json.Marshal(m)
	select {
	case c.out <- b:
	default: // too slow: drop it rather than block everyone
	}
}

// ToUser: a message to every device of a player.
func (h *Hub) ToUser(user string, m Msg) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		if c.user == user {
			h.send(c, m)
		}
	}
}

// ToPlace: a message to everyone in a place.
func (h *Hub) ToPlace(place string, m Msg) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		if c.place == place {
			h.send(c, m)
		}
	}
}

// Online: is the player connected now.
func (h *Hub) Online(user string) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		if c.user == user {
			return true
		}
	}
	return false
}

// presence: who is in the place, sent to everyone there.
func (h *Hub) presence(place string) {
	h.mu.Lock()
	var names []string
	for c := range h.clients {
		if c.place == place && !slices.Contains(names, c.name) {
			names = append(names, c.name)
		}
	}
	h.mu.Unlock()
	slices.Sort(names)
	h.ToPlace(place, Msg{"t": "presence", "place": place, "names": names})
}

// Serve: GET /live?token=…&name=…&place=… (a WebSocket).
func (h *Hub) Serve(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	user, err := h.Tokens.Parse(q.Get("token"))
	if err != nil {
		http.Error(w, "connecte-toi d'abord", http.StatusUnauthorized)
		return
	}
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
	if err != nil {
		return
	}
	defer conn.CloseNow()
	c := &client{user: user, name: q.Get("name"), place: q.Get("place"), out: make(chan []byte, 64)}
	if len(c.name) > 24 {
		c.name = c.name[:24]
	}
	h.mu.Lock()
	h.clients[c] = true
	h.mu.Unlock()
	h.presence(c.place)
	defer func() {
		h.mu.Lock()
		delete(h.clients, c)
		h.mu.Unlock()
		h.presence(c.place)
	}()

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	go func() {
		ping := time.NewTicker(25 * time.Second)
		defer ping.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case b := <-c.out:
				wctx, done := context.WithTimeout(ctx, 10*time.Second)
				err := conn.Write(wctx, websocket.MessageText, b)
				done()
				if err != nil {
					cancel()
					return
				}
			case <-ping.C:
				_ = conn.Ping(ctx)
			}
		}
	}()
	conn.SetReadLimit(4096)
	for {
		_, b, err := conn.Read(ctx)
		if err != nil {
			return
		}
		var m struct {
			T     string `json:"t"`
			Place string `json:"place"`
			Duel  string `json:"duel"`
			Score int    `json:"score"`
			Shout int    `json:"shout"`
		}
		if json.Unmarshal(b, &m) != nil {
			continue
		}
		switch m.T {
		case "place": // the player went to another of his places
			old := c.place
			h.mu.Lock()
			c.place = m.Place
			h.mu.Unlock()
			h.presence(old)
			h.presence(c.place)
		case "duel": // his score in a duel, a few times a second
			if h.Duel != nil && m.Duel != "" {
				h.Duel(ctx, c.user, m.Duel, m.Score)
			}
		case "shout":
			if m.Shout >= 0 && m.Shout < len(Shouts) {
				h.ToPlace(c.place, Msg{"t": "shout", "name": c.name, "text": Shouts[m.Shout]})
			}
		}
	}
}

func init() { log.SetFlags(log.LstdFlags | log.Lshortfile) }
