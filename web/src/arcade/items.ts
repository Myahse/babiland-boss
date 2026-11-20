import { styleFx } from './styles'
import type { IconName } from './Icons'
import { PLACES, type PlaceId } from './places'
import { placeState } from './store'

// What you can add to a maquis from the « Aménager » panel: assistants who work for you, and things for the
// room (more chairs, a TV for the football, fans, music, a drinks fridge). Each one shows in the shop and does
// something: faster cooking, a second server, someone who picks up the money, more tips, more customers…

export type ItemId = 'cuisiniere' | 'serveur2' | 'ramasseur' | 'chaises' | 'tele' | 'ventilo' | 'musique' | 'frigo'
export type Item = { id: ItemId; kind: 'staff' | 'room'; icon: IconName; label: string; text: string; price: number; needs?: (s: ReturnType<typeof placeState>) => string | null }

export const ITEMS: Item[] = [
  { id: 'cuisiniere', kind: 'staff', icon: 'chef', label: 'Une cuisinière', text: 'Elle aide aux réchauds : tous les plats cuisent 35 % plus vite.', price: 3000 },
  { id: 'serveur2', kind: 'staff', icon: 'chef', label: 'Un 2e serveur', text: 'Il porte aussi les plats des réchauds au comptoir.', price: 4000, needs: (s) => (s.unlocks.serveur ? null : 'Embauche d’abord le 1er serveur') },
  { id: 'ramasseur', kind: 'staff', icon: 'person', label: 'Un commis', text: 'Il ramasse l’argent par terre et les pourboires des tables pour toi.', price: 3500, needs: (s) => (s.unlocks.caisse ? null : 'Embauche d’abord la caissière') },
  { id: 'chaises', kind: 'room', icon: 'chair', label: 'Des chaises en plus', text: 'Deux chaises de plus à chaque table : on y mange en groupe, les pourboires sont plus gros (+60 %).', price: 2500, needs: (s) => (s.unlocks.table ? null : 'Ouvre d’abord la terrasse') },
  { id: 'tele', kind: 'room', icon: 'tv', label: 'Une télé pour le foot', text: 'Les gens viennent voir le match : +15 % de clients, ils attendent plus longtemps.', price: 4000 },
  { id: 'ventilo', kind: 'room', icon: 'fan', label: 'Des ventilos', text: 'Il fait moins chaud : les clients attendent bien plus longtemps avant de partir.', price: 1500 },
  { id: 'musique', kind: 'room', icon: 'soundOn', label: 'La musique', text: 'Coupé-décalé dans les enceintes et guirlandes : +10 % de clients, +10 % de renommée.', price: 3000 },
  { id: 'frigo', kind: 'room', icon: 'fridge', label: 'Un frigo à boissons', text: 'Chaque client prend aussi une boisson fraîche : +100 F par client.', price: 3500 },
]
/** prices grow with the price of a plate in the place */
export const itemPrice = (place: PlaceId, it: Item) => Math.round((it.price * Math.max(1, PLACES[place].plate / 500)) / 100) * 100
export const has = (place: PlaceId, id: ItemId) => placeState(place).items.includes(id)

/** What the things in the room do (1 = nothing). */
export const fx = (place: PlaceId) => {
  const st = placeState(place)
  const h = (id: ItemId) => st.items.includes(id)
  const sf = styleFx(st.style)
  return {
    cook: (h('cuisiniere') ? 1.35 : 1) * sf.cook,
    customers: (h('tele') ? 1.15 : 1) * (h('musique') ? 1.1 : 1) * sf.customers,
    patience: (h('ventilo') ? 1.6 : 1) * (h('tele') ? 1.2 : 1) * sf.patience,
    tips: (h('chaises') ? 1.6 : 1) * sf.tips,
    drink: h('frigo') ? 100 : 0,
    fame: (h('musique') ? 1.1 : 1) * sf.fame,
  }
}
