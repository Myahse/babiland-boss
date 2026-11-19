import type { Look } from '../three/Person'
import type { PersonId } from '../three/RealPerson'

export type Customer = {
  name: string
  /** realistic 3D model (Meshy) */
  person: PersonId
  look: Look
  orderPiment: string[]
  orderSans: string[]
  happy: string[]
  ok: string[]
  angry: string[]
}

// What customers say, in French with Nouchi. {p} is the price of the plate.
const HAPPY = ['C’est doux dêh ! Tu es fort !', 'Ehhh, c’est gâté ! Je reviens demain.', 'Garba-là est trop bon, faut pas changer hein !']
const OK = ['Ça va aller, c’est mangeable.', 'Pas mal, mais tu peux faire mieux dêh.', 'On va dire que c’est bon.']
const ANGRY = ['Ehhh, c’est quoi ça ? Tu veux me tuer ?', 'Mon argent-là, c’est pas pour ça dêh !', 'Poisson-là est cramé, faut pas me faire ça !']

export const CUSTOMERS: Customer[] = [
  {
    name: 'Koffi',
    person: 'koffi',
    look: { skin: '#6b3e26', top: '#1c7ed6', bottom: '#343a40', head: 'cap', headColor: '#f76707' },
    orderPiment: ['On dit quoi, Boss ? Garba {p}, mets piment dedans hein !', 'Garba {p} pour moi, bien pimenté !'],
    orderSans: ['On dit quoi ? Garba {p}, mais pas de piment dêh.', 'Garba {p}, sans piment, j’ai ulcère.'],
    happy: HAPPY, ok: OK, angry: ANGRY,
  },
  {
    name: 'Awa',
    person: 'awa',
    look: { skin: '#8a5233', top: '#e64980', topWax: true, bottom: '#f59f00', head: 'braids', headColor: '#1b1110' },
    orderPiment: ['Boss, garba {p} ! Piment beaucoup !', 'Ma part de garba {p}, avec piment s’il te plaît.'],
    orderSans: ['Garba {p}, sans piment hein, je suis pressée.', 'Un garba {p}, mais piment non dêh.'],
    happy: HAPPY, ok: OK, angry: ANGRY,
  },
  {
    name: 'Yao',
    person: 'yao',
    look: { skin: '#4a2a1a', top: '#f8f9fa', bottom: '#2b8a3e', head: 'hair', headColor: '#120c0a' },
    orderPiment: ['Mon vieux père, garba {p}, piment dedans, faut charger !', 'Garba {p} ! Piment, piment, piment !'],
    orderSans: ['Garba {p}. Laisse piment-là, mon cœur ne peut pas.', 'Garba {p} sans piment, merci Boss.'],
    happy: HAPPY, ok: OK, angry: ANGRY,
  },
  {
    name: 'Fatou',
    person: 'fatou',
    look: { skin: '#7a4a2e', top: '#7048e8', topWax: true, bottom: '#7048e8', head: 'scarf', headColor: '#2f9e44' },
    orderPiment: ['Bonjour mon enfant, garba {p} avec piment.', 'Garba {p}, piment un peu seulement.'],
    orderSans: ['Garba {p}, pas de piment, c’est pour mon petit.', 'Donne-moi garba {p}, sans piment.'],
    happy: HAPPY, ok: OK, angry: ANGRY,
  },
]
