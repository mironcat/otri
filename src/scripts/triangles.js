export default function makeTriangle({ prefix_name, point_color }) {
  const triangleGroup = draw.group().attr({ id: prefix_name })
  const pointA = draw.circle(10).fill(point_color).draggable().attr({ id: prefix_name + '-pointA' })
  const pointB = draw.circle(10).fill(point_color).draggable().attr({ id: prefix_name + '-pointA' })
  triangleGroup.add(pointA).add(pointB)
  const coords = {
    A: { cx: 0, cy: 0 },
    B: { cx: 0, cy: 0 },
    cornerP: { cx: 0, cy: 0 },
    tangP: { cx: 0, cy: 0 }
  }
  const res = {
    distances: {
      AtoC: 0,
      BtoC: 0
    }
  }
  pointA.on('dragmove.namespace', function (event) {
    const bFA = baseFrame.attr(['x', 'y', 'width'])
    cornerP

    // adTangentLine.attr({ x1: this.attr('cx') })
    // avTangentLine.attr({ x1: this.attr('cx') })
    // updateMeasures()
    // updateTangentObjects()
  })
  function init({ cornerP, A, B, tangP }) {
    pointA.move(A.cx, A.cy)
    pointB.move(B.cx, B.cy)
    coords.A = A
    coords.B = B
    coords.cornerP = cornerP
    coords.tangP = tangP
    // console.log('initialized')
  }
  function calcDistances() {
    res.distances.AtoC = getLengthByCoordinates({ x1: coords.A.cx, y1: coords.A.cy, x2: coords.cornerP.cx, y2: coords.cornerP.cy })
    res.distances.BtoC = getLengthByCoordinates({ x1: coords.B.cx, y1: coords.B.cy, x2: coords.cornerP.cx, y2: coords.cornerP.cy })
    return { AtoC: res.distances.AtoC, BtoC: res.distances.BtoC }
  }
  // return { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 }
  return { init, calcDistances }
}
