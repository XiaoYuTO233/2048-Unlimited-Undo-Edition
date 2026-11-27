import type { SudokuLevel } from '../../data/sudokuLevels'

interface ExampleCandidates {
  digits: string
  fill?: string
  remove?: string
}

export interface TechniqueExample {
  grid: readonly string[]
  rows?: readonly number[]
  columns?: readonly number[]
  boxes?: readonly number[]
  candidates: Readonly<Partial<Record<number, ExampleCandidates>>>
}

interface SudokuTechnique {
  stars: SudokuLevel['difficulty']
  title: string
  rule: string
  observation: string
  action: string
  example: TechniqueExample
}

function at(row: number, column: number) {
  return (row - 1) * 9 + column - 1
}

export const sudokuTechniques: readonly SudokuTechnique[] = [
  {
    stars: 1,
    title: '显性唯一',
    rule: '一个空格只剩一个候选数，就可以直接填入。',
    observation: '看第 1 行第 3 列。去掉同行、同列和同宫已经出现的数字后，这格只剩候选数 6。',
    action: '在第 1 行第 3 列填入 6。',
    example: {
      grid: ['280749000', '003600074', '000301000', '001060000', '079008006', '400900000', '700590080', '305006002', '000000009'],
      rows: [1],
      columns: [3],
      boxes: [1],
      candidates: {
        [at(1, 3)]: { digits: '6', fill: '6' },
      },
    },
  },
  {
    stars: 2,
    title: '隐性唯一',
    rule: '一个数字在某行、某列或某宫只剩一个可填位置，就填到那里。',
    observation: '看第 3 行的数字 6。第 1 列有 5、6、9 三个候选数，但这一行只有这格还允许填 6。',
    action: '在第 3 行第 1 列填入 6，即使这格还有其他候选数。',
    example: {
      grid: ['024000600', '001007042', '037824000', '009300000', '016008504', '008000001', '005000020', '193000408', '762000030'],
      rows: [3],
      candidates: {
        [at(3, 1)]: { digits: '569', fill: '6' },
      },
    },
  },
  {
    stars: 3,
    title: '区块排除',
    rule: '某个数字在一宫内的候选格都落在同一行或列，就能删掉这条线在宫外的同一候选数。反过来，如果一条线的候选格集中在同一宫，也能从宫内这条线以外的格子删掉该候选数。',
    observation: '右中宫的候选数 6 只出现在第 4 行第 7、8 列。这个宫里的 6 必定占据第 4 行。',
    action: '删去第 4 行第 1、2 列的候选数 6，保留右中宫里的两个候选位置。',
    example: {
      grid: ['036072504', '004600020', '720400836', '007024000', '000709245', '240016000', '070200000', '080067002', '902100070'],
      rows: [4],
      boxes: [6],
      candidates: {
        [at(4, 1)]: { digits: '13568', remove: '6' },
        [at(4, 2)]: { digits: '1569', remove: '6' },
        [at(4, 7)]: { digits: '1369' },
        [at(4, 8)]: { digits: '1689' },
      },
    },
  },
  {
    stars: 4,
    title: '显性数对',
    rule: '同一行、列或宫中，两个空格都恰好只有相同的两个候选数，这两个数字就只能由这两格占用。',
    observation: '第 2 行第 3、5 列都只剩候选数 5 和 7。无论这两个数字如何交换位置，第 2 行其余空格都用不到它们。',
    action: '在第 2 行，第 1 列删去候选数 7，第 2 列删去候选数 5。',
    example: {
      grid: ['103240000', '000908163', '008103040', '079000600', '002000000', '501032400', '000010304', '816324005', '004000016'],
      rows: [2],
      candidates: {
        [at(2, 1)]: { digits: '247', remove: '7' },
        [at(2, 2)]: { digits: '245', remove: '5' },
        [at(2, 3)]: { digits: '57' },
        [at(2, 5)]: { digits: '57' },
      },
    },
  },
  {
    stars: 5,
    title: 'X-Wing',
    rule: '同一个数字在两行中各只有两个候选格，且恰好落在同样的两列，这两列的其余格就可以删去该候选数。行列对调也成立。',
    observation: '第 2、7 行的候选数 3 都只出现在第 2、9 列，形成四个角。两个 3 最终会占据其中一条对角线。',
    action: '保留四个角的候选数 3，删去第 3 行第 2 列和第 8 行第 9 列的候选数 3。',
    example: {
      grid: ['980030641', '500600780', '006080005', '794802006', '258306090', '613000800', '400008560', '829060000', '065000008'],
      rows: [2, 7],
      columns: [2, 9],
      candidates: {
        [at(2, 2)]: { digits: '34' },
        [at(2, 9)]: { digits: '239' },
        [at(3, 2)]: { digits: '347', remove: '3' },
        [at(7, 2)]: { digits: '37' },
        [at(7, 9)]: { digits: '2379' },
        [at(8, 9)]: { digits: '347', remove: '3' },
      },
    },
  },
]
