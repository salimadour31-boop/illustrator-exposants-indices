// Tests du cœur texte / text core tests
var ctx = require("./load")(), C = ctx.EI_CORE;
var pass = 0, fail = 0;
function eq(name, got, exp) { if (got === exp) pass++; else { fail++; console.log("ÉCHEC " + name + "\n  obtenu  " + JSON.stringify(got) + "\n  attendu " + JSON.stringify(exp)); } }
var ALL = { ord: true, ordFix: true, ordEn: true, abbr: true, abbrMeDr: false, numero: false, units: true, unitUnicode: false, unitNeg: false,
    chem: true, chemUnicode: false, chemExtra: [], marks: true, markConv: true, frac: false, fracMode: "opentype", examples: true };
function opts(over) { var o = {}, k; for (k in ALL) o[k] = ALL[k]; for (k in (over || {})) o[k] = over[k]; return o; }
// Rendu lisible : ^{…} exposant, _{…} indice, ~{…} fraction / readable rendering
function show(s, o) {
    var r = C.analyse(s, o), out = C.applyEdits(s, r.edits).split("");
    r.fmts.slice().reverse().forEach(function (f) {
        var tag = { sup: "^", sub: "_", frac: "~", mark: "^" }[f.kind];
        out.splice(f.start + f.len, 0, "}"); out.splice(f.start, 0, tag + "{");
    });
    return out.join("");
}
function t(s, exp, over) { eq(s, show(s, opts(over)), exp); }

// Ordinaux français / French ordinals
t("le 1er mai", "le 1^{er} mai");
t("la 1re fois, les 1ers, les 1res", "la 1^{re} fois, les 1^{ers}, les 1^{res}");
t("le 2e, les 3es", "le 2^{e}, les 3^{es}");
t("la 2ème édition", "la 2^{e} édition");
t("le 21ième siècle", "le 21^{e} siècle");
t("3è prix", "3^{e} prix");
t("1ère fois", "1^{re} fois");
t("les 2èmes", "les 2^{es}");
t("XIXème siècle", "XIX^{e} siècle");
t("le XXIe siècle", "le XXI^{e} siècle");
t("François Ier", "François I^{er}");
t("la Ve République", "la V^{e} République");
t("le IIIe Reich", "le III^{e} Reich");
t("la 2nde, le 2nd", "la 2^{nde}, le 2^{nd}");
t("2ème", "2ème", { ordFix: false });
t("1e", "1e");           // pas « 1e » / not valid
t("1es", "1es");
t("0e", "0e");
// Garde-fous / guards
t("Le De Ce Me Ne Se", "Le De Ce Me Ne Se");
t("Louis XIV et Elle", "Louis XIV et Elle");
t("A2e B3e 4e5 3e8 2e-3", "A2e B3e 4e5 3e8 2e-3");
t("#4e4e4e", "#4e4e4e");
t("1.2e 1,5e", "1.2e 1,5e");
t("www.site2e.com a@b2e.fr le_2e.ai", "www.site2e.com a@b2e.fr le_2e.ai");
t("2ed 2ee 2eme2", "2ed 2ee 2eme2");
t("DIe MIe", "DI^{e} MI^{e}");   // valeurs romaines valides : accepté / valid Roman values
// Anglais / English
t("1st 2nd 3rd 4th", "1^{st} 2^{nd} 3^{rd} 4^{th}");
t("11th 12th 13th 21st 22nd 23rd 101st 111th", "11^{th} 12^{th} 13^{th} 21^{st} 22^{nd} 23^{rd} 101^{st} 111^{th}");
t("2th 11st 12nd 13rd 1rd", "2th 11st 12nd 13rd 1rd");
t("1st", "1st", { ordEn: false });

// Abréviations / abbreviations
t("Mme Dupont, Mmes, Mlle, Mlles, Mgr, Cie, Vve", "M^{me} Dupont, M^{mes}, M^{lle}, M^{lles}, M^{gr}, C^{ie}, V^{ve}");
t("Mmex Cies AMme", "Mmex Cies AMme");
t("Me Durand, Dr Martin", "Me Durand, Dr Martin");
t("Me Durand, Dr Martin, Dr. House, tell me", "M^{e} Durand, D^{r} Martin, Dr. House, tell me", { abbrMeDr: true });
t("Me voici", "Me voici", { abbrMeDr: true });
t("n° 5 et N° 7, nos n°s", "n^{o} 5 et N^{o} 7, nos n^{os}", { numero: true });
t("n° 5", "n° 5");

// Unités / units
t("120 m2, 3 cm3, 50km2, 2 mm2", "120 m^{2}, 3 cm^{3}, 50km^{2}, 2 mm^{2}");
t("prix au m2 (m2)", "prix au m^{2} (m^{2})");
t("Item2 M2 m22 m2x am2", "Item2 M2 m22 m2x am2");
t("1 200 ft2, 3 in2", "1 200 ft^{2}, 3 in^{2}");
t("120 \u06452 \u0648 \u0661\u0660\u0660\u0645\u0662 \u0633\u06452", "120 \u0645^{2} \u0648 \u0661\u0660\u0660\u0645^{\u0662} \u0633\u0645^{2}");
t("\u0642\u0633\u06452", "\u0642\u0633\u06452");
t("120 m2 et 3 m3", "120 m\u00B2 et 3 m\u00B3", { unitUnicode: true });
t("120 m\u00B2", "120 m\u00B2");

// Exposants négatifs / negative exponents
t("9,81 m\u00B7s-2", "9,81 m\u00B7s-2");
t("9,81 m\u00B7s-2, kg\u00B7m-3, 10 s-1, W m-2", "9,81 m\u00B7s^{\u22122}, kg\u00B7m^{\u22123}, 10 s^{\u22121}, W m^{\u22122}", { unitNeg: true });
t("Classe A-1, page s-1, CO-2, Version V-2", "Classe A-1, page s-1, CO-2, Version V-2", { unitNeg: true });
t("m\u00B2\u00B7s-1", "m\u00B2\u00B7s^{\u22121}", { unitNeg: true });

// Chimie / chemistry
t("CO2, H2O, CH4, CO2e, NO2", "CO_{2}, H_{2}O, CH_{4}, CO_{2}e, NO_{2}");
t("PM2.5 et PM10", "PM_{2.5} et PM_{10}");
t("C6H12O6", "C_{6}H_{12}O_{6}");
t("Ca(OH)2", "Ca(OH)_{2}");
t("B2B H1N1 A4 R2D2 U2 K2 V8 F1 CO2x XCO2 4CO2", "B2B H1N1 A4 R2D2 U2 K2 V8 F1 CO2x XCO2 4CO2");
t("CO2.", "CO_{2}.");
t("CO2.5", "CO2.5");
t("caféine C8H10N4O2", "caféine C_{8}H_{10}N_{4}O_{2}", { chemExtra: C.parseList("C8H10N4O2, foo, Na2SO4") });
t("CO2 H2O", "CO\u2082 H\u2082O", { chemUnicode: true });
t("PM2.5", "PM\u2082.\u2085", { chemUnicode: true });
t("2e-3 1e+6 5e\u22122", "2e-3 1e+6 5e\u22122");
t("le 2e - et 3e-", "le 2^{e} - et 3^{e}-");
t("2e-3e siècle, XIIe-XIIIe", "2^{e}-3^{e} siècle, XII^{e}-XIII^{e}");
eq("parseList", C.parseList("C8H10N4O2, foo; Na2SO4  x=1").join(","), "C8H10N4O2,Na2SO4");

// Marques / marks
t("Acme\u00AE et Brand\u2122 \u2120", "Acme^{\u00AE} et Brand^{\u2122} ^{\u2120}");
t("Brand(R), Brand(TM), Brand(SM)", "Brand^{\u00AE}, Brand^{\u2122}, Brand^{\u2120}");
t("(R) seul, Brand (R), (R)x", "(R) seul, Brand (R), (R)x");
t("Brand(R)", "Brand(R)", { markConv: false });
t("\u00A9 2026", "\u00A9 2026");

// Fractions
t("1/2 tasse, 3/4, 1 1/2, 7/8", "1/2 tasse, 3/4, 1 1/2, 7/8");
t("1/2 tasse, 3/4, 1 1/2, 7/8", "~{1/2} tasse, ~{3/4}, 1 ~{1/2}, ~{7/8}", { frac: true });
t("17/10/2026 24/7 16/9 4/3 1/1 10/12/26 3/4/5 1/20 x1/2 1/2x 2.1/2 1/2.5", "17/10/2026 24/7 16/9 4/3 1/1 10/12/26 3/4/5 1/20 x1/2 1/2x 2.1/2 1/2.5", { frac: true });
t("1/2 3/4 3/16", "\u00BD \u00BE ~{3/16}", { frac: true, fracMode: "unicode" });
t("1\u20442", "~{1\u20442}", { frac: true });

// Mélange / mixed
t("Le 1er prix : 120 m2 de CO2 pour Acme(R), Mme Dupont.", "Le 1^{er} prix : 120 m^{2} de CO_{2} pour Acme^{\u00AE}, M^{me} Dupont.");
t("Paragraphe 1\rLe 2ème\u0003m2", "Paragraphe 1\rLe 2^{e}\u0003m^{2}");

// Exemples / examples
var ex = C.analyse("2ème 3ème 4ème 5ème CO2", opts()).examples;
eq("exemples max 3 par catégorie", ex.filter(function (e) { return e.cat === "ord"; }).length, 3);
var ex0 = ex.filter(function (e) { return e.cat === "ord"; })[0];
eq("exemple avant/après", ex0.before + "→" + ex0.after, "2ème→2^e");

// --- Aléatoire : idempotence et cohérence / random idempotence & consistency ---
var POOL = ["1er", "2ème", "XIXe", "3è", "1ère", "21st", "4th", "Mme", "Mlles", "Cie", "m2", "cm3", "km2", "CO2", "H2O", "PM2.5", "C6H12O6",
    "Brand(R)", "Acme\u00AE", "\u2122", "1/2", "3/4", "17/10/2026", "24/7", "Le", "De", "Item2", "A4", "B2B", "#4e4e4e", "3e8", "www.a2e.fr",
    "120", "le", "de", "prix", "au", "\u06452", "s-1", "kg\u00B7m-3", "n\u00B0", "Me", "Dr", "2nde", "16/9", "x", "(R)", "1/2.5", "Ier"];
var SEP = [" ", " ", " ", ", ", ". ", "\r", "\u00A0", "", "-", "/", "(", ")"];
var seed = 42; function rnd(n) { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; }
var MODES = [opts(), opts({ frac: true, unitNeg: true, abbrMeDr: true, numero: true }), opts({ unitUnicode: true, chemUnicode: true, frac: true, fracMode: "unicode" })];
var bad = 0;
for (var it = 0; it < 3000; it++) {
    var s = "", L = 1 + rnd(9);
    for (var j = 0; j < L; j++) s += POOL[rnd(POOL.length)] + SEP[rnd(SEP.length)];
    var o = MODES[it % 3];
    var r1 = C.analyse(s, o), s1 = C.applyEdits(s, r1.edits);
    var r2 = C.analyse(s1, o);
    // n° → nº n'est plus reconnaissable au second passage (rien à refaire) / n° → nº is not re-detected (nothing left to do)
    var f1 = r1.fmts.filter(function (f) { return !(f.cat === "abbr" && /^os?$/.test(s1.substr(f.start, f.len))); });
    var ok = r2.edits.length === 0 && JSON.stringify(r2.fmts) === JSON.stringify(f1);
    // plages dans les bornes, sans chevauchement, et sur les bons caractères / ranges valid
    var last = -1;
    r1.fmts.forEach(function (f) {
        if (f.start < 0 || f.start + f.len > s1.length || f.len < 1 || f.start < last) ok = false;
        last = f.start + f.len;
        var txt = s1.substr(f.start, f.len);
        if (f.cat === "ord" && !/^(er|re|ers|res|e|es|nd|nde|nds|ndes|st|rd|th)$/.test(txt)) ok = false;
        if (f.cat === "chem" && !/^[0-9.]+$/.test(txt)) ok = false;
        if (f.cat === "unit" && !/^[23\u0662\u0663]$/.test(txt)) ok = false;
        if (f.kind === "mark" && !/^[\u00AE\u2122\u2120]$/.test(txt)) ok = false;
        if (f.kind === "frac" && !/^\d+[\/\u2044]\d+$/.test(txt)) ok = false;
    });
    // longueur : seules des suppressions changent la longueur / only removals change length
    var rem = r1.edits.filter(function (e) { return e.type === "remove"; }).length;
    if (s1.length !== s.length - rem) ok = false;
    if (!ok) { bad++; if (bad < 5) console.log("ÉCHEC aléatoire : " + JSON.stringify(s)); }
}
eq("3000 cas aléatoires (idempotence, bornes, caractères)", bad, 0);

console.log("Cœur : " + pass + " réussis, " + fail + " échoués");
process.exitCode = fail ? 1 : 0;
