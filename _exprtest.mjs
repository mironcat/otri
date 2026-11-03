const args = [
  "om", "Math", "fmt", "ratio", "degrees", "getLength", "getHeight",
  "getShellLengthType", "getPlenateType", "getDegreeOfElongation",
  "getSLNTypeofCurve", "getAlfaTypeofCurve", "getOrientationTypeofCurve",
];
const exprs = [
  "ratio(om.length, om.height)",
  "fmt(om.length)",
  "getShellLengthType(getLength(om))",
  "(om.ad?.hc || om.ad?.vc) ? getOrientationTypeofCurve(om.ad) : ''",
  "getSLNTypeofCurve(om.ad?.ln ? om.ad.sln / om.ad.ln : NaN)",
  "degrees(om.ad.alfa)",
];
for (const e of exprs) {
  try {
    new Function(...args, `"use strict"; return (${e});`);
    console.log("OK", e);
  } catch (err) {
    console.log("FAIL", e, err.message);
  }
}
