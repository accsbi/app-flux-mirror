// High & Low（test_high_low プロトタイプ仕様）の型。
// 親=Defend(表向き) / 子=Attack(裏向き→宣言→公開)。PLAYER(p1) vs CPU(p2)。

export type PlayerId = 'p1' | 'p2'
export type Role = 'attack' | 'defend'
export type Declaration = 'high' | 'low'
export type Result = 'win' | 'lose' | 'tie'
export type Phase = 'preparation' | 'declare' | 'open' | 'result' | 'gameover'

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export type Card = {
  suit: Suit
  rank: Rank
  value: number // 2=2(最弱) … K=13, A=14(最強)
}

export type Player = {
  id: PlayerId
  name: string
  role: Role
  deck: Card[]
  acquired: Card[]
}

export type GameState = {
  phase: Phase
  players: Record<PlayerId, Player>
  defendCard: Card | null
  attackCard: Card | null
  declaration: Declaration | null
  result: Result | null
  discard: Card[]
  round: number
  busy: boolean
}
