import type { ThreeElements } from '@react-three/fiber'
import { RealPerson, type Action, type PersonId } from './RealPerson'
import { SimplePerson } from './SimplePerson'

/** Which style of people to show: realistic (Meshy) by default, the simple "ad game" style with ?look=simple. */
const asked = new URLSearchParams(location.search).get('look')
/** realistic (Meshy) by default; ?look=simple for the ad-game people; ?look=drawn for the cartoon-drawing look */
export const LOOK: 'real' | 'simple' | 'drawn' | 'arcade' = asked === 'simple' || asked === 'drawn' || asked === 'arcade' ? asked : 'real'

export function Character(props: { who: PersonId; action?: Action; chopping?: boolean } & ThreeElements['group']) {
  return LOOK !== 'real' ? <SimplePerson {...props} /> : <RealPerson {...props} />
}
