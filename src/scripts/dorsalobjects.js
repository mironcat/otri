// import { SVG } from '@svgdotjs/svg.js'
// const draw = SVG()
// import { inject } from 'vue'
// import { EventBus } from 'quasar'
// const bus = new EventBus()
/*
Drawing steps
draw all objects
  - baseFrame with frameResizer
  depending on concave_vs:
    - PMC points
    - tangent PMC points with connection lines
    -

*/
import {
  lineTolineIntersectionPoint,
  getAngleBetweenPoints,
  getLengthByCoordinates,
  addMouseOverToPoint,
  getLineFromAnglePoint,
  constrainPointMovement,
  addLockToggle,
} from "src/scripts/utils.js";
import { applyScales, getLineScale } from "src/scripts/geostyle.js";
export default function DorsalSideObjects(draw, om, scales, bus) {
  let mobjects = draw.group().attr({ id: "dso" });
  let moDat = {
    //default Base Frame Size
    bFwidth: 350,
    bFheight: 200,
  };
  const pMargin = 0.15; // persents
  let tPC = {
    //tangentPointsCoords
    ad: { x: moDat.bFwidth * pMargin, y: moDat.bFheight * pMargin },
    pd: {
      x: moDat.bFwidth - moDat.bFwidth * pMargin,
      y: moDat.bFheight * pMargin,
    },
    av: {
      x: moDat.bFwidth * pMargin,
      y: moDat.bFheight - moDat.bFheight * pMargin,
    },
    pv: {
      x: moDat.bFwidth - moDat.bFwidth * pMargin,
      y: moDat.bFheight - moDat.bFheight * pMargin,
    },
    v: { x: moDat.bFwidth / 2, y: moDat.bFheight - moDat.bFheight * pMargin },
  };
  const baseFrame = draw
    .rect(moDat.bFwidth, moDat.bFheight)
    .stroke({ color: "gray", width: 1 })
    .fill({ color: "green", opacity: 0.02 });

  // двойной клик по рамке — возвращаем группу в горизонтальное положение
  // (mousedown + таймштамп, т.к. dblclick не доходит из-за svg.draggable)
  {
    let last = 0;
    baseFrame.node.addEventListener("mousedown", function (e) {
      const now = Date.now();
      if (now - last < 350) {
        e.stopPropagation();
        const M = mobjects.matrixify();
        const angle = Math.atan2(M.b, M.a);
        if (Math.abs(angle) > 0.005) {
          const b = mobjects.bbox();
          mobjects.transform(
            M.clone().rotate(-(angle * 180) / Math.PI, b.cx, b.cy),
          );
        }
        last = 0;
        return;
      }
      last = now;
    });
  }

  const frameResizer = draw
    .rect(15, 15)
    .fill({ color: "darkgreen" })
    .move(moDat.bFwidth, moDat.bFheight)
    .draggable();
  // PMC points
  const createPMCpoint = (x, y) =>
    addMouseOverToPoint(
      draw.circle().radius(5).fill("red").draggable().move(x, y),
    );
  const aPMC = createPMCpoint(-5, moDat.bFheight / 2);
  const pPMC = createPMCpoint(moDat.bFwidth - 5, moDat.bFheight / 2);
  const rPMC = createPMCpoint(moDat.bFwidth / 2, -5);
  const lPMC = createPMCpoint(moDat.bFwidth / 2, moDat.bFheight - 5);
  // const alPMC = draw.circle(10).fill('red').draggable().move(moDat.bFwidth / 4, moDat.bFheight - 5)
  // const plPMC = draw.circle(10).fill('red').draggable().move(moDat.bFwidth / 4 * 3, moDat.bFheight - 5)

  mobjects = draw
    .group()
    .attr({ id: "mobjects" })
    .add(baseFrame)
    .add(frameResizer);
  // tangent PMC points connection line
  const PCMpolylineCoords = [
    [aPMC.attr("cx"), aPMC.attr("cy")],
    [rPMC.attr("cx"), rPMC.attr("cy")],
    [pPMC.attr("cx"), pPMC.attr("cy")],
    [lPMC.attr("cx"), lPMC.attr("cy")],
    [aPMC.attr("cx"), aPMC.attr("cy")],
  ];
  let PMCconnectLine = draw.polyline(PCMpolylineCoords);
  PMCconnectLine.fill("none").stroke({
    color: "gray",
    dasharray: "1,6",
    width: 2,
  });
  mobjects.add(PMCconnectLine);
  //add PMC points
  mobjects.add(aPMC).add(pPMC).add(rPMC).add(lPMC);
  // .add(alPMC).add(plPMC)
  // !om.value.concave_vs ? mobjects : mobjects.clear(lPMC)
  // tangent objects
  const createTangentPoint = (x, y) =>
    addMouseOverToPoint(
      draw.circle().radius(5).fill("orange").draggable().move(x, y),
    );
  const adTangentPoint = createTangentPoint(tPC.ad.x, tPC.ad.y);
  const pdTangentPoint = createTangentPoint(tPC.pd.x, tPC.pd.y);
  const avTangentPoint = createTangentPoint(tPC.av.x, tPC.av.y);
  const pvTangentPoint = createTangentPoint(tPC.pv.x, tPC.pv.y);

  const adTangentLine = draw
    .line(0, 0, tPC.ad.x, tPC.ad.y)
    .stroke({ color: "gray", width: 1 });
  const pdTangentLine = draw
    .line(moDat.bFwidth, 0, tPC.pd.x + 6, tPC.pd.y)
    .stroke({ color: "gray", width: 1 });
  const avTangentLine = draw
    .line(0, moDat.bFheight, tPC.av.x, tPC.av.y + 6)
    .stroke({ color: "gray", width: 1 });
  const pvTangentLine = draw
    .line(moDat.bFwidth, moDat.bFheight, tPC.pv.x + 6, tPC.pv.y + 6)
    .stroke({ color: "gray", width: 1 });

  // Tangent cross line points: crossPointsCoords - cpc
  const cpc = getCrossPointsCoordinates(baseFrame);
  const adCrossPoint = draw
    .circle(6)
    .fill("green")
    .move(cpc.ad.point.x, cpc.ad.point.y);
  const pdCrossPoint = draw
    .circle(6)
    .fill("green")
    .move(cpc.pd.point.x, cpc.pd.point.y);
  const avCrossPoint = draw
    .circle(6)
    .fill("green")
    .move(cpc.av.point.x, cpc.av.point.y);
  const pvCrossPoint = draw
    .circle(6)
    .fill("green")
    .move(cpc.pv.point.x, cpc.pv.point.y);
  mobjects
    .add(adCrossPoint)
    .add(avCrossPoint)
    .add(pdCrossPoint)
    .add(pvCrossPoint);
  // return draw
  //--------- Angle Parralel lines -----------------
  const apL = getAnglePointLineCoordinates();
  const adAnglePointLine = draw
    .line(apL.ad.st.x, apL.ad.st.y, apL.ad.en.x, apL.ad.en.y)
    .stroke({ color: "gray", width: 1 });
  const pdAnglePointLine = draw
    .line(apL.pd.st.x, apL.pd.st.y, apL.pd.en.x, apL.pd.en.y)
    .stroke({ color: "gray", width: 1 });
  const avAnglePointLine = draw
    .line(apL.av.st.x, apL.av.st.y, apL.av.en.x, apL.av.en.y)
    .stroke({ color: "gray", width: 1 });
  const pvAnglePointLine = draw
    .line(apL.pv.st.x, apL.pv.st.y, apL.pv.en.x, apL.pv.en.y)
    .stroke({ color: "gray", width: 1 });

  mobjects
    .add(adAnglePointLine)
    .add(pdAnglePointLine)
    .add(avAnglePointLine)
    .add(pvAnglePointLine);
  mobjects.add(adTangentLine).add(adTangentPoint);
  mobjects.add(pdTangentLine).add(pdTangentPoint);
  mobjects.add(avTangentLine).add(avTangentPoint);
  mobjects.add(pvTangentLine).add(pvTangentPoint);
  adTangentPoint.on("mouseover", () =>
    adAnglePointLine.stroke({ color: "red", width: 2 * getLineScale() }),
  );
  adTangentPoint.on("mouseout", () =>
    adAnglePointLine.stroke({ color: "gray", width: 1 * getLineScale() }),
  );
  pdTangentPoint.on("mouseover", () =>
    pdAnglePointLine.stroke({ color: "red", width: 2 * getLineScale() }),
  );
  pdTangentPoint.on("mouseout", () =>
    pdAnglePointLine.stroke({ color: "gray", width: 1 * getLineScale() }),
  );
  avTangentPoint.on("mouseover", () =>
    avAnglePointLine.stroke({ color: "red", width: 2 * getLineScale() }),
  );
  avTangentPoint.on("mouseout", () =>
    avAnglePointLine.stroke({ color: "gray", width: 1 * getLineScale() }),
  );
  pvTangentPoint.on("mouseover", () =>
    pvAnglePointLine.stroke({ color: "red", width: 2 * getLineScale() }),
  );
  pvTangentPoint.on("mouseout", () =>
    pvAnglePointLine.stroke({ color: "gray", width: 1 * getLineScale() }),
  );

  function getAnglePointLineCoordinates() {
    const attrs_bf = baseFrame.attr(["x", "y", "width", "height"]);
    return {
      ad: getLineFromAnglePoint(adTangentPoint, aPMC, rPMC, {
        x: attrs_bf.x,
        y: attrs_bf.y,
      }),
      pd: getLineFromAnglePoint(pdTangentPoint, rPMC, pPMC, {
        x: attrs_bf.x + attrs_bf.width,
        y: attrs_bf.y,
      }),
      av: getLineFromAnglePoint(avTangentPoint, aPMC, lPMC, {
        x: attrs_bf.x,
        y: attrs_bf.y + attrs_bf.height,
      }),
      pv: getLineFromAnglePoint(pvTangentPoint, lPMC, pPMC, {
        x: attrs_bf.x + attrs_bf.width,
        y: attrs_bf.y + attrs_bf.height,
      }),
    };
  }

  function addMeasureObjects() {
    mobjects.draggable().move(300, 300).show();
    return this;
  }
  function getCrossPointsCoordinates() {
    const attrs_bf = baseFrame.attr(["x", "y", "width", "height"]);
    // Tangent cross line points
    const cpc = {
      ad: {
        x1: aPMC.attr("cx"),
        y1: aPMC.attr("cy"),
        x2: rPMC.attr("cx"),
        y2: rPMC.attr("cy"),
        x3: adTangentPoint.attr("cx"),
        y3: adTangentPoint.attr("cy"),
        x4: attrs_bf.x,
        y4: attrs_bf.y,
      },
      pd: {
        x1: rPMC.attr("cx"),
        y1: rPMC.attr("cy"),
        x2: pPMC.attr("cx"),
        y2: pPMC.attr("cy"),
        x3: attrs_bf.x + attrs_bf.width,
        y3: attrs_bf.y,
        x4: pdTangentPoint.attr("cx"),
        y4: pdTangentPoint.attr("cy"),
      },
      av: {
        x1: aPMC.attr("cx"),
        y1: aPMC.attr("cy"),
        x2: lPMC.attr("cx"),
        y2: lPMC.attr("cy"),
        x3: attrs_bf.x,
        y3: attrs_bf.y + attrs_bf.height,
        x4: avTangentPoint.attr("cx"),
        y4: avTangentPoint.attr("cy"),
      },
      pv: {
        x1: pPMC.attr("cx"),
        y1: pPMC.attr("cy"),
        x2: lPMC.attr("cx"),
        y2: lPMC.attr("cy"),
        x3: attrs_bf.x + attrs_bf.width,
        y3: attrs_bf.y + attrs_bf.height,
        x4: pvTangentPoint.attr("cx"),
        y4: pvTangentPoint.attr("cy"),
      },
    };
    cpc.ad.point = lineTolineIntersectionPoint(cpc.ad);
    cpc.pd.point = lineTolineIntersectionPoint(cpc.pd);
    cpc.av.point = lineTolineIntersectionPoint(cpc.av);
    cpc.pv.point = lineTolineIntersectionPoint(cpc.pv);
    return cpc;
  }
  frameResizer.on("dragmove.namespace", function (event) {
    const coords = frameResizer.attr(["x", "y"]);
    const coords_bf = baseFrame.attr(["x", "y"]);
    baseFrame.attr({
      width: coords.x - coords_bf.x,
      height: coords.y - coords_bf.y,
    });
    aPMC.attr({ cy: coords_bf.y + (coords.y - coords_bf.y) / 2 });
    rPMC.attr({ cx: coords_bf.x + (coords.x - coords_bf.x) / 2 });
    pPMC.attr({
      cx: coords_bf.x + (coords.x - coords_bf.x),
      cy: coords_bf.y + (coords.y - coords_bf.y) / 2,
    });
    lPMC.attr({
      cx: coords_bf.x + (coords.x - coords_bf.x) / 2,
      cy: coords_bf.y + (coords.y - coords_bf.y),
    });
    updateTangentObjects(pMargin);
    updateMeasures();
  });
  function updateTangentObjects({ pMargin = 0.15 }) {
    const attrs_bf = baseFrame.attr(["x", "y", "width", "height"]);
    moDat = {
      //tangentPointsCoords
      bFwidth: attrs_bf.width,
      bFheight: attrs_bf.height,
    };
    tPC = {
      //tangentPointsCoords
      ad: {
        x: attrs_bf.x + moDat.bFwidth * pMargin,
        y: attrs_bf.y + moDat.bFheight * pMargin,
      },
      pd: {
        x: attrs_bf.x + moDat.bFwidth - moDat.bFwidth * pMargin,
        y: attrs_bf.y + moDat.bFheight * pMargin,
      },
      av: {
        x: attrs_bf.x + moDat.bFwidth * pMargin,
        y: attrs_bf.y + moDat.bFheight - moDat.bFheight * pMargin,
      },
      pv: {
        x: attrs_bf.x + moDat.bFwidth - moDat.bFwidth * pMargin,
        y: attrs_bf.y + moDat.bFheight - moDat.bFheight * pMargin,
      },
    };
    // tangent Points
    adTangentPoint.attr({ cx: tPC.ad.x, cy: tPC.ad.y });
    pdTangentPoint.attr({ cx: tPC.pd.x, cy: tPC.pd.y });
    avTangentPoint.attr({ cx: tPC.av.x, cy: tPC.av.y });
    pvTangentPoint.attr({ cx: tPC.pv.x, cy: tPC.pv.y });
    // tangent Lines
    adTangentLine.attr({
      x1: attrs_bf.x,
      y1: attrs_bf.y,
      x2: tPC.ad.x,
      y2: tPC.ad.y,
    });
    pdTangentLine.attr({
      x1: attrs_bf.x + attrs_bf.width,
      y1: attrs_bf.y,
      x2: tPC.pd.x,
      y2: tPC.pd.y,
    });
    avTangentLine.attr({
      x1: attrs_bf.x,
      y1: attrs_bf.height + attrs_bf.y,
      x2: tPC.av.x,
      y2: tPC.av.y,
    });
    pvTangentLine.attr({
      x1: attrs_bf.x + attrs_bf.width,
      y1: attrs_bf.height + attrs_bf.y,
      x2: tPC.pv.x,
      y2: tPC.pv.y,
    });
  }

  bus.on("dorsal-show", (visible) => {
    visible ? mobjects.show() : mobjects.hide();
  });
  pdTangentPoint.on("dragmove.namespace", function (event) {
    const attrs_bf = baseFrame.attr(["x", "y", "width", "height"]);
    constrainPointMovement(
      this,
      baseFrame,
      attrs_bf.x + attrs_bf.width,
      attrs_bf.y,
      pdTangentLine,
      updateMeasures,
    );
  });
  adTangentPoint.on("dragmove.namespace", function (event) {
    const attrs_bf = baseFrame.attr(["x", "y", "width", "height"]);
    constrainPointMovement(
      this,
      baseFrame,
      attrs_bf.x,
      attrs_bf.y,
      adTangentLine,
      updateMeasures,
    );
  });
  pvTangentPoint.on("dragmove.namespace", function (event) {
    const attrs_bf = baseFrame.attr(["x", "y", "width", "height"]);
    constrainPointMovement(
      this,
      baseFrame,
      attrs_bf.x + attrs_bf.width,
      attrs_bf.height + attrs_bf.y,
      pvTangentLine,
      updateMeasures,
    );
  });
  avTangentPoint.on("dragmove.namespace", function (event) {
    const attrs_bf = baseFrame.attr(["x", "y", "width", "height"]);
    constrainPointMovement(
      this,
      baseFrame,
      attrs_bf.x,
      attrs_bf.height + attrs_bf.y,
      avTangentLine,
      updateMeasures,
    );
  });
  aPMC.on("dragmove.namespace", function (event) {
    // const bFA = baseFrame.attr(['x', 'y', 'width'])
    baseFrame.attr({
      x: this.attr("cx"),
      width: pPMC.attr("cx") - this.attr("cx"),
    });
    adTangentLine.attr({ x1: this.attr("cx") });
    avTangentLine.attr({ x1: this.attr("cx") });
    updateMeasures();
    // updateTangentObjects()
  });
  rPMC.on("dragmove.namespace", function (event) {
    // console.log(event)
    baseFrame.attr({
      y: this.attr("cy"),
      height: lPMC.attr("cy") - this.attr("cy"),
    });
    updateMeasures();
    adTangentLine.attr({ y1: this.attr("cy") });
    pdTangentLine.attr({ y1: this.attr("cy") });
    // updateTangentObjects()
  });
  pPMC.on("dragmove.namespace", function (event) {
    // console.log(event)
    // const bFA = baseFrame.attr(['x', 'y', 'width',])
    baseFrame.attr({ width: this.attr("cx") - baseFrame.attr("x") });
    frameResizer.attr({ x: this.attr("cx") });
    pdTangentLine.attr({ x1: this.attr("cx") });
    pvTangentLine.attr({ x1: this.attr("cx") });
    updateMeasures();
    // updateTangentObjects()
  });
  lPMC.on("dragmove.namespace", function (event) {
    // console.log(event)
    baseFrame.attr({
      y: this.attr("cy") - baseFrame.attr("height"),
      height: this.attr("cy") - rPMC.attr("cy"),
    });
    frameResizer.attr({ y: this.attr("cy") });
    updateMeasures();
    avTangentLine.attr({ y1: this.attr("cy") });
    pvTangentLine.attr({ y1: this.attr("cy") });
    // updateTangentObjects()
  });
  function updateAdditionalObjects() {
    const cpc = getCrossPointsCoordinates();
    adCrossPoint.attr({ cx: cpc.ad.point.x, cy: cpc.ad.point.y });
    pdCrossPoint.attr({ cx: cpc.pd.point.x, cy: cpc.pd.point.y });
    avCrossPoint.attr({ cx: cpc.av.point.x, cy: cpc.av.point.y });
    pvCrossPoint.attr({ cx: cpc.pv.point.x, cy: cpc.pv.point.y });

    const apL = getAnglePointLineCoordinates();
    adAnglePointLine.attr({
      x1: apL.ad.st.x,
      y1: apL.ad.st.y,
      x2: apL.ad.en.x,
      y2: apL.ad.en.y,
    });
    pdAnglePointLine.attr({
      x1: apL.pd.st.x,
      y1: apL.pd.st.y,
      x2: apL.pd.en.x,
      y2: apL.pd.en.y,
    });
    avAnglePointLine.attr({
      x1: apL.av.st.x,
      y1: apL.av.st.y,
      x2: apL.av.en.x,
      y2: apL.av.en.y,
    });
    pvAnglePointLine.attr({
      x1: apL.pv.st.x,
      y1: apL.pv.st.y,
      x2: apL.pv.en.x,
      y2: apL.pv.en.y,
    });

    PMCconnectLine.plot([
      [aPMC.attr("cx"), aPMC.attr("cy")],
      [rPMC.attr("cx"), rPMC.attr("cy")],
      [pPMC.attr("cx"), pPMC.attr("cy")],
      [lPMC.attr("cx"), lPMC.attr("cy")],
      [aPMC.attr("cx"), aPMC.attr("cy")],
    ]);
  }
  function updateMeasures() {
    lockIcon.position();
    updateAdditionalObjects();
    om.value.length_dorsal = baseFrame.attr("width") * scales.value.factor;
    om.value.width = baseFrame.attr("height") * scales.value.factor;
    const bFA = baseFrame.attr(["x", "y", "width", "height"]);
    const p = {
      //coordinates of baseFrame corner points
      ad: { x: bFA.x, y: bFA.y },
      pd: { x: bFA.x + bFA.width, y: bFA.y },
      av: { x: bFA.x, y: bFA.y + bFA.height },
      pv: { x: bFA.x + bFA.width, y: bFA.y + bFA.height },
    };
    // alfa
    om.value.ar.alfa = getAngleBetweenPoints(
      p.ad.x,
      p.ad.y,
      rPMC.attr("cx"),
      rPMC.attr("cy"),
      adTangentPoint.attr("cx"),
      adTangentPoint.attr("cy"),
    );
    om.value.al.alfa = Math.abs(
      getAngleBetweenPoints(
        p.av.x,
        p.av.y,
        lPMC.attr("cx"),
        lPMC.attr("cy"),
        avTangentPoint.attr("cx"),
        avTangentPoint.attr("cy"),
      ),
    );
    om.value.pr.alfa = getAngleBetweenPoints(
      p.pd.x,
      p.pd.y,
      pdTangentPoint.attr("cx"),
      pdTangentPoint.attr("cy"),
      rPMC.attr("cx"),
      rPMC.attr("cy"),
    );
    om.value.pl.alfa = Math.abs(
      getAngleBetweenPoints(
        p.pv.x,
        p.pv.y,
        pvTangentPoint.attr("cx"),
        pvTangentPoint.attr("cy"),
        lPMC.attr("cx"),
        lPMC.attr("cy"),
      ) - 360,
    );
    // hc
    om.value.ar.hc = (rPMC.attr("cx") - p.ad.x) * scales.value.factor;
    om.value.al.hc = (lPMC.attr("cx") - p.av.x) * scales.value.factor;
    om.value.pr.hc = (p.pd.x - rPMC.attr("cx")) * scales.value.factor;
    om.value.pl.hc = (p.pv.x - lPMC.attr("cx")) * scales.value.factor;
    // vc
    om.value.ar.vc = (aPMC.attr("cy") - p.ad.y) * scales.value.factor;
    om.value.al.vc = (p.av.y - aPMC.attr("cy")) * scales.value.factor;
    om.value.pr.vc = (pPMC.attr("cy") - p.pd.y) * scales.value.factor;
    om.value.pl.vc = (p.pv.y - pPMC.attr("cy")) * scales.value.factor;
    // ln
    om.value.ar.ln =
      getLengthByCoordinates({
        x1: p.ad.x,
        y1: p.ad.y,
        x2: adCrossPoint.attr("cx"),
        y2: adCrossPoint.attr("cy"),
      }) * scales.value.factor;
    om.value.pr.ln =
      getLengthByCoordinates({
        x1: p.pd.x,
        y1: p.pd.y,
        x2: pdCrossPoint.attr("cx"),
        y2: pdCrossPoint.attr("cy"),
      }) * scales.value.factor;
    om.value.al.ln =
      getLengthByCoordinates({
        x1: p.av.x,
        y1: p.av.y,
        x2: avCrossPoint.attr("cx"),
        y2: avCrossPoint.attr("cy"),
      }) * scales.value.factor;
    om.value.pl.ln =
      getLengthByCoordinates({
        x1: p.pv.x,
        y1: p.pv.y,
        x2: pvCrossPoint.attr("cx"),
        y2: pvCrossPoint.attr("cy"),
      }) * scales.value.factor;
    // sln
    om.value.ar.sln =
      getLengthByCoordinates({
        x1: p.ad.x,
        y1: p.ad.y,
        x2: adTangentPoint.attr("cx"),
        y2: adTangentPoint.attr("cy"),
      }) * scales.value.factor;
    om.value.pr.sln =
      getLengthByCoordinates({
        x1: p.pd.x,
        y1: p.pd.y,
        x2: pdTangentPoint.attr("cx"),
        y2: pdTangentPoint.attr("cy"),
      }) * scales.value.factor;
    om.value.al.sln =
      getLengthByCoordinates({
        x1: p.av.x,
        y1: p.av.y,
        x2: avTangentPoint.attr("cx"),
        y2: avTangentPoint.attr("cy"),
      }) * scales.value.factor;
    om.value.pl.sln =
      getLengthByCoordinates({
        x1: p.pv.x,
        y1: p.pv.y,
        x2: pvTangentPoint.attr("cx"),
        y2: pvTangentPoint.attr("cy"),
      }) * scales.value.factor;
    bus.emit("measure-updated", om.value);
  }
  function show(visible) {
    visible ? mobjects.show() : mobjects.hide();
  }
  function refreshPoints() {
    // программная «встряска» тангенсных точек: их dragmove-обработчики
    // пересчитывают линии к углам рамки и меры.
    // ВАЖНО: fire("dragmove") без namespace — svg.js хранит обработчики
    // под именем без namespace, и fire с namespace их не находит
    [adTangentPoint, pdTangentPoint, avTangentPoint, pvTangentPoint].forEach(
      (p) => p.fire("dragmove"),
    );
  }
  // применить текущие множители размеров (точки/линии) — только r и stroke-width
  applyScales(mobjects);
  // полупрозрачный замочек в центре рамки (toggle следования за картинкой)
  const lockIcon = addLockToggle(
    draw,
    mobjects,
    baseFrame,
    om,
    bus,
    frameResizer,
    "dorsal",
  );
  return {
    addMeasureObjects,
    updateMeasures,
    show,
    // внутренняя группа с точками/рамкой — для перетаскивания вслед за картинкой
    mobjects,
    // точки по ролям + рамка
    points: {
      a: aPMC,
      p: pPMC,
      d: rPMC,
      v: lPMC,
      t_ad: adTangentPoint,
      t_pd: pdTangentPoint,
      t_av: avTangentPoint,
      t_pv: pvTangentPoint,
    },
    baseFrame,
    frameResizer,
    refreshPoints,
  };
}
