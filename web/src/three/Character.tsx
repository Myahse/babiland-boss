import type { ThreeElements } from '@react-three/fiber'
import { RealPerson, type Action, type PersonId } from './RealPerson'
import { SimplePerson } from './SimplePerson'

/** Which style of people to show: realistic (Meshy) by default, the simple "ad game" style with ?look=simple. */
export const LOOK: 'real' | 'simple' = new URLSearchParams(location.search).get('look') === 'simple' ? 'simple' : 'real'

export function Character(props: { who: PersonId; action?: Action; chopping?: boolean } & ThreeElements['group']) {
  return LOOK === 'simple' ? <SimplePerson {...props} /> : <RealPerson {...props} />
}
