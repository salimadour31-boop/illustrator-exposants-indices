//@target illustrator
/*
 * ExposantsIndices.jsx — v1.0.0
 * Exposants et indices automatiques pour Illustrator / Automatic superscripts & subscripts for Illustrator
 *
 * FR : Illustrator n'a ni GREP ni styles GREP : les « 1er », « XIXe », « Mme », « m2 », « CO2 »,
 *      « ® » et « 1/2 » doivent être passés en exposant ou en indice à la main, lettre par lettre.
 *      Ce script repère ces cas selon le contexte (pas les dates, codes, URL, références produit)
 *      et les met en forme en une passe : ordinaux français et anglais (avec correction de
 *      2ème, 1ère, 3è → 2e, 1re, 3e), abréviations françaises (Mme, Mlle, Mgr, Cie…), unités au
 *      carré / au cube (m2, cm3, km2, م2), exposants négatifs SI, formules chimiques (CO2, H2O,
 *      CH4, PM2.5…), marques ® ™ ℠ (sauf si la police les dessine déjà petits) et vraies fractions.
 *      Rendu : vrais exposants OpenType de la police quand elle en a (mesuré), sinon exposant
 *      d'Illustrator, ou réglage manuel (taille et décalage en %).
 * EN : Illustrator has no GREP and no GREP styles, so "1st", "XIXe", "Mme", "m2", "CO2", "®" and
 *      "1/2" must be superscripted or subscripted by hand. This script finds them in context
 *      (not dates, codes, URLs or product references) and formats them in one pass: French and
 *      English ordinals (fixing 2ème, 1ère → 2e, 1re), French abbreviations, squared / cubed
 *      units, negative SI exponents, chemical formulas, ® ™ ℠ marks (unless the font already
 *      draws them small) and real fractions. Rendering: the font's real OpenType superiors when
 *      it has them (measured), otherwise Illustrator's superscript, or manual size / shift.
 *
 * Auteur / Author : Amirouche Amwanes — Licence MIT / MIT License
 * Cible / Target : Adobe Illustrator CC 2018+ (ExtendScript ES3). Non testé dans Illustrator.
 * Aucun appel réseau, aucune collecte de données. / No network calls, no data collection.
 * Conseil : travaillez sur une copie du document. / Tip: work on a copy of your document.
 */

/* ===================================================================== */
/*  1. CŒUR TEXTE (pur, sans Illustrator) / PURE TEXT CORE                */
/*     Travaille sur des chaînes ; testable hors Illustrator.             */
/*     Works on plain strings; testable outside Illustrator.              */
/* ===================================================================== */

var EI_CORE = (function () {

    // Caractère de mot (latin, accents, grec, cyrillique, arabe, tifinagh) / word character
    var WORD_RE = /[0-9A-Za-z\u00AA\u00B2\u00B3\u00B5\u00B9\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u0400-\u04FF\u0600-\u0669\u066E-\u06D3\u06D5-\u06FF\u0750-\u077F\u1E00-\u1EFF\u2070-\u209F\u2D30-\u2D7F]/;
    var LETTER_RE = /[A-Za-z\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u0400-\u04FF\u0620-\u064A\u066E-\u06D3\u06D5\u06FA-\u06FF\u0750-\u077F\u1E00-\u1EFF\u2D30-\u2D7F]/;
    var SPACE_RE = /[\s\u00A0\u2000-\u200B\u202F\u205F\u3000\u0003]/;

    function isWord(c) { return c !== undefined && c !== "" && WORD_RE.test(c); }
    function isLetter(c) { return c !== undefined && c !== "" && LETTER_RE.test(c); }
    function isDigit(c) { return c !== undefined && c >= "0" && c <= "9"; }
    function isSpace(c) { return c !== undefined && c !== "" && SPACE_RE.test(c); }
    function inList(arr, v) { for (var i = 0; i < arr.length; i++) if (arr[i] === v) return true; return false; }

    var SUP_DIG = { "1": "\u00B9", "2": "\u00B2", "3": "\u00B3" };
    var SUB_DIG = "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089";
    var VULGAR = { "1/2": "\u00BD", "1/4": "\u00BC", "3/4": "\u00BE", "1/3": "\u2153", "2/3": "\u2154",
        "1/5": "\u2155", "2/5": "\u2156", "3/5": "\u2157", "4/5": "\u2158", "1/6": "\u2159", "5/6": "\u215A",
        "1/7": "\u2150", "1/8": "\u215B", "3/8": "\u215C", "5/8": "\u215D", "7/8": "\u215E", "1/9": "\u2151", "1/10": "\u2152" };

    // Formules chimiques courantes (emballage, environnement, alimentation, santé)
    // Common chemical formulas (packaging, environment, food, health)
    var CHEM = ["CO2", "CO2e", "CO2eq", "H2O", "H2O2", "O2", "O3", "N2", "N2O", "NO2", "SO2", "SO3", "CH4", "NH3", "NH4",
        "H2", "H2S", "H2SO4", "H3PO4", "HNO3", "CaCO3", "NaHCO3", "Na2CO3", "C6H12O6", "C12H22O11", "C2H5OH", "C2H6O",
        "CH3COOH", "C3H8", "C4H10", "C2H4", "C2H2", "Fe2O3", "Fe3O4", "Al2O3", "SiO2", "TiO2", "MgSO4", "CaSO4", "CuSO4",
        "P2O5", "K2O", "KNO3", "NaNO3", "NaNO2", "CaCl2", "MgCl2", "Cl2", "CF4", "SF6", "PM2.5", "PM10", "PM1",
        "MnO2", "ZnSO4", "CaO2", "Mg(OH)2", "Ca(OH)2", "Al(OH)3", "NaClO3", "KMnO4", "UO2", "Li2CO3", "LiFePO4"];

    var UNITS = ["km", "hm", "dam", "dm", "cm", "mm", "\u00B5m", "\u03BCm", "nm", "m", "ft", "in", "yd", "mi"];
    var AR_UNITS = ["\u0643\u0645", "\u0633\u0645", "\u0645\u0645", "\u0645"]; // كم سم مم م
    var NEG_UNITS = ["kg", "mg", "g", "km", "cm", "mm", "m", "s", "h", "min", "mol", "K", "L", "l", "N", "J", "W", "Pa", "Hz", "A", "V", "kWh", "Wh"];

    var ROMAN_RE = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
    function romanValue(r) {
        if (!r || !ROMAN_RE.test(r)) return 0;
        var V = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }, n = 0;
        for (var i = 0; i < r.length; i++) {
            var a = V[r.charAt(i)], b = i + 1 < r.length ? V[r.charAt(i + 1)] : 0;
            n += a < b ? -a : a;
        }
        return n;
    }

    // Suffixes d'ordinaux, du plus long au plus court / ordinal suffixes, longest first
    var ORD_RE = /(\d+|[IVXLCDM]+)(i\u00E8mes|i\u00E8me|iemes|ieme|\u00E8mes|\u00E8me|emes|eme|\u00E8res|\u00E8re|\u00E8s|\u00E8|ndes|nde|nds|nd|ers|er|res|re|es|e|st|rd|th)(?![0-9A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F])/g;

    // Forme correcte d'un ordinal, ou null / canonical ordinal suffix or null
    function ordinalTarget(base, suf, o) {
        var isNum = isDigit(base.charAt(0)), n;
        if (isNum) { n = parseInt(base, 10); if (isNaN(n)) return null; }
        else {
            if (base.length === 1 && !inList(["I", "V", "X"], base)) return null;  // Le, De, Me, Ce…
            n = romanValue(base); if (!n) return null;
        }
        var fix = { "i\u00E8mes": "es", "i\u00E8me": "e", "iemes": "es", "ieme": "e", "\u00E8mes": "es", "\u00E8me": "e",
            "emes": "es", "eme": "e", "\u00E8s": "es", "\u00E8": "e", "\u00E8res": "res", "\u00E8re": "re" };
        var t = suf;
        if (fix.hasOwnProperty(suf)) { if (!o.ordFix) return null; t = fix[suf]; }
        if (t === "er" || t === "re" || t === "ers" || t === "res") return n === 1 ? t : null;
        if (t === "e" || t === "es") return n >= 2 ? t : null;
        if (t === "nd" || t === "nde" || t === "nds" || t === "ndes") {
            if (t === "nd" && isNum && n % 10 === 2 && n % 100 !== 12) return t;   // 2nd, 22nd (EN)
            return n === 2 ? t : null;                                            // 2nd, 2nde (FR)
        }
        if (!isNum || !o.ordEn) return null;
        var d = n % 10, h = n % 100;
        if (t === "st") return d === 1 && h !== 11 ? t : null;
        if (t === "rd") return d === 3 && h !== 13 ? t : null;
        if (t === "th") return (d === 1 || d === 2 || d === 3) && !(h >= 11 && h <= 13) ? null : t;
        return null;
    }

    // Transforme src en tgt (tgt suffixe de src, ou même longueur) / edits turning src into tgt
    function suffixEdits(start, src, tgt) {
        var e = [], i;
        if (src === tgt) return e;
        if (src.length > tgt.length && src.substring(src.length - tgt.length) === tgt) {
            for (i = 0; i < src.length - tgt.length; i++) e.push({ index: start + i, type: "remove" });
            return e;
        }
        if (src.length === tgt.length) {
            for (i = 0; i < src.length; i++) if (src.charAt(i) !== tgt.charAt(i)) e.push({ index: start + i, type: "replace", ch: tgt.charAt(i) });
            return e;
        }
        return null;
    }

    // Zones protégées : URL, e-mails, mots-dièse, noms de fichiers / protected tokens
    function protectedMask(s) {
        var m = [], i = 0, n = s.length;
        for (var k = 0; k < n; k++) m.push(false);
        while (i < n) {
            while (i < n && isSpace(s.charAt(i))) i++;
            var j = i;
            while (j < n && !isSpace(s.charAt(j))) j++;
            if (j > i) {
                var t = s.substring(i, j);
                if (t.indexOf("@") >= 0 || t.indexOf("://") >= 0 || /^[("'«]?www\./i.test(t) || /^[("'«]?#/.test(t) ||
                    t.indexOf("_") >= 0 || t.indexOf("\\") >= 0 || /\.(ai|eps|pdf|svg|png|jpe?g|tiff?|psd|html?|com|net|org|dz|fr)\b/i.test(t)) {
                    for (k = i; k < j; k++) m[k] = true;
                }
            }
            i = j;
        }
        return m;
    }

    function newCounts() { return { ord: 0, ordFix: 0, abbr: 0, unit: 0, unitNeg: 0, chem: 0, mark: 0, markConv: 0, frac: 0 }; }

    /*
     * Analyse une chaîne / analyses a string.
     * Retour / returns { edits: [...], fmts: [{start, len, kind: sup|sub|frac|mark, cat, base}], examples: [], counts }
     *  - edits : modifications du contenu (corrections, caractères Unicode), indices dans s ;
     *  - fmts  : mises en forme à appliquer, indices dans le texte APRÈS les edits.
     */
    function analyse(s, o) {
        var n = s.length, busy = [], edits = [], fmts = [], examples = [], counts = newCounts(), i, k, m;
        var prot = protectedMask(s);
        for (i = 0; i < n; i++) busy.push(prot[i]);
        function free(a, b) { for (var q = a; q < b; q++) if (busy[q]) return false; return true; }
        function take(a, b) { for (var q = a; q < b; q++) busy[q] = true; }
        function okBefore(a) { var c = s.charAt(a - 1); return a === 0 || !(isWord(c) || c === "." || c === "," || c === "#" || c === "/" || c === "+" || c === "\u2044"); }
        // 2e-3, 1e+6 : notation scientifique (mais pas 2e-3e) / scientific notation (but not 2e-3e)
        function sciAfter(b) {
            if (!/[\-+\u2212]/.test(s.charAt(b))) return false;
            var q = b + 1, NUMC = /[0-9\u00B2\u00B3\u00B9\u00BC-\u00BE\u2150-\u215E]/;
            if (!NUMC.test(s.charAt(q))) return false;
            while (q < n && NUMC.test(s.charAt(q))) q++;
            return !isLetter(s.charAt(q));
        }
        function okAfter(b) { var c = s.charAt(b); return b >= n || !isWord(c); }
        var pend = []; // { start, len, kind, cat, shift } en indices d'origine / original indices
        function example(cat, a, b, after) {
            if (!o.examples) return;
            var c = 0; for (var q = 0; q < examples.length; q++) if (examples[q].cat === cat) c++;
            if (c < 3) examples.push({ cat: cat, before: s.substring(a, b), after: after });
        }

        // --- (R) (TM) (SM) collés à un mot → ® ™ ℠ / attached (R) (TM) → ® ™ ---
        if (o.marks && o.markConv) {
            var MC = /\((R|TM|SM)\)/g;
            while ((m = MC.exec(s)) !== null) {
                var a0 = m.index, b0 = a0 + m[0].length;
                if (a0 === 0 || !isWord(s.charAt(a0 - 1)) || !okAfter(b0) || !free(a0, b0)) continue;
                var sym = m[1] === "R" ? "\u00AE" : (m[1] === "TM" ? "\u2122" : "\u2120");
                edits.push({ index: a0, type: "replace", ch: sym });
                for (k = a0 + 1; k < b0; k++) edits.push({ index: k, type: "remove" });
                take(a0, b0); counts.markConv++;
                pend.push({ start: a0, len: 1, kind: "mark", cat: "mark" });
                example("mark", a0, b0, sym + "^");
            }
        }

        // --- ® ™ ℠ ---
        if (o.marks) {
            for (i = 0; i < n; i++) {
                var ch = s.charAt(i);
                if ((ch === "\u00AE" || ch === "\u2122" || ch === "\u2120") && !busy[i]) {
                    take(i, i + 1); pend.push({ start: i, len: 1, kind: "mark", cat: "mark" });
                    example("mark", i, i + 1, ch + "^");
                }
            }
        }

        // --- Formules chimiques / chemical formulas ---
        if (o.chem) {
            var list = CHEM.concat(o.chemExtra || []);
            list.sort(function (x, y) { return y.length - x.length; });
            for (k = 0; k < list.length; k++) {
                var f = list[k]; if (!f || !/\d/.test(f)) continue;
                var from = 0, p;
                while ((p = s.indexOf(f, from)) >= 0) {
                    from = p + 1;
                    var e0 = p + f.length;
                    var before = s.charAt(p - 1);
                    if (p > 0 && isWord(before)) continue;
                    if (!okAfter(e0) || s.charAt(e0) === "." && isDigit(s.charAt(e0 + 1))) continue;
                    if (!free(p, e0)) continue;
                    take(p, e0);
                    var shown = "";
                    for (var q = 0; q < f.length; q++) {
                        var cq = f.charAt(q), isSubDigit = isDigit(cq) || (cq === "." && isDigit(f.charAt(q - 1)) && isDigit(f.charAt(q + 1)));
                        if (!isSubDigit || (f.substring(0, 2) === "PM" && q < 2)) { shown += cq; continue; }
                        if (o.chemUnicode && cq === ".") { shown += cq; continue; }   // PM₂.₅ : point laissé / dot kept
                        if (o.chemUnicode && isDigit(cq)) {
                            edits.push({ index: p + q, type: "replace", ch: SUB_DIG.charAt(parseInt(cq, 10)) });
                            shown += SUB_DIG.charAt(parseInt(cq, 10));
                        } else {
                            pend.push({ start: p + q, len: 1, kind: "sub", cat: "chem" });
                            shown += "_" + cq;
                        }
                    }
                    counts.chem++;
                    example("chem", p, e0, shown);
                }
            }
        }

        // --- Fractions ---
        if (o.frac) {
            var FR = /(\d{1,3})[\/\u2044](\d{1,3})/g;
            while ((m = FR.exec(s)) !== null) {
                var fa = m.index, fb = fa + m[0].length;
                var num = parseInt(m[1], 10), den = parseInt(m[2], 10);
                if (!okBefore(fa) || isDigit(s.charAt(fa - 1))) continue;
                var nx = s.charAt(fb);
                if (fb < n && (isWord(nx) || nx === "/" || nx === "\u2044" || (nx === "." || nx === ",") && isDigit(s.charAt(fb + 1)))) continue;
                if (!(num >= 1 && num < den && inList([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 32, 64], den))) continue;
                if (!free(fa, fb)) continue;
                take(fa, fb); counts.frac++;
                var key = num + "/" + den;
                if (s.charAt(fa + m[1].length) === "\u2044") key = "";
                if (o.fracMode === "unicode" && VULGAR.hasOwnProperty(key)) {
                    edits.push({ index: fa, type: "replace", ch: VULGAR[key] });
                    for (k = fa + 1; k < fb; k++) edits.push({ index: k, type: "remove" });
                    example("frac", fa, fb, VULGAR[key]);
                } else {
                    pend.push({ start: fa, len: fb - fa, kind: "frac", cat: "frac", numLen: m[1].length });
                    example("frac", fa, fb, m[1] + "\u2044" + m[2]);
                }
            }
        }

        // --- Ordinaux / ordinals ---
        if (o.ord) {
            ORD_RE.lastIndex = 0;
            while ((m = ORD_RE.exec(s)) !== null) {
                var oa = m.index, base = m[1], suf = m[2], sa = oa + base.length, ob = sa + suf.length;
                if (!okBefore(oa) || !free(oa, ob)) continue;
                // pas de lettre majuscule juste avant un romain (évite « DIe » dans un mot) / guard
                var tgt = ordinalTarget(base, suf, o);
                if (!tgt) continue;
                // notation scientifique 2e-3, 1e+6 / scientific notation
                if (isDigit(base.charAt(0)) && sciAfter(ob)) continue;
                // « 2e » collé à un exposant/chiffre ou dans une plage de nombres scientifiques : déjà filtré par lookahead
                var ed = suffixEdits(sa, suf, tgt);
                if (ed === null) continue;
                take(oa, ob);
                for (k = 0; k < ed.length; k++) edits.push(ed[k]);
                if (ed.length) counts.ordFix++;
                counts.ord++;
                // l'exposant porte sur les derniers caractères (après suppression) / superscript the kept chars
                pend.push({ start: ob - tgt.length, len: tgt.length, kind: "sup", cat: "ord" });
                example("ord", oa, ob, base + "^" + tgt);
            }
        }

        // --- Abréviations françaises / French abbreviations ---
        if (o.abbr) {
            var AB = ["Mmes", "Mme", "Mlles", "Mlle", "Mgrs", "Mgr", "Cie", "Vve"];
            if (o.abbrMeDr) { AB.push("Me"); AB.push("Drs"); AB.push("Dr"); }
            for (k = 0; k < AB.length; k++) {
                var w = AB[k], fr0 = 0, pa;
                while ((pa = s.indexOf(w, fr0)) >= 0) {
                    fr0 = pa + 1;
                    var pb = pa + w.length;
                    if (!okBefore(pa) || isLetter(s.charAt(pa - 1)) || !okAfter(pb) || !free(pa, pb)) continue;
                    if (w === "Dr" || w === "Drs") { if (s.charAt(pb) === ".") continue; }
                    if (w === "Me") {  // Maître : seulement devant un nom propre / only before a proper name
                        var j2 = pb; if (!isSpace(s.charAt(j2))) continue;
                        while (j2 < n && isSpace(s.charAt(j2))) j2++;
                        var nc = s.charAt(j2);
                        if (!(nc && nc === nc.toUpperCase() && nc !== nc.toLowerCase())) continue;
                    }
                    take(pa, pb); counts.abbr++;
                    pend.push({ start: pa + 1, len: w.length - 1, kind: "sup", cat: "abbr" });
                    example("abbr", pa, pb, w.charAt(0) + "^" + w.substring(1));
                }
            }
            if (o.numero) {   // n° 5 → nº 5 (o en exposant) / numero sign
                var NR = /([nN])\u00B0(s?)/g;
                while ((m = NR.exec(s)) !== null) {
                    var na = m.index, nb2 = na + m[0].length;
                    if (!okBefore(na) || isLetter(s.charAt(na - 1)) || !okAfter(nb2) || !free(na, nb2)) continue;
                    take(na, nb2); counts.abbr++;
                    edits.push({ index: na + 1, type: "replace", ch: "o" });
                    pend.push({ start: na + 1, len: m[0].length - 1, kind: "sup", cat: "abbr" });
                    example("abbr", na, nb2, m[1] + "^o" + m[2]);
                }
            }
        }

        // --- Unités au carré / au cube / squared & cubed units ---
        if (o.units) {
            var allU = UNITS.concat(AR_UNITS);
            allU.sort(function (x, y) { return y.length - x.length; });
            for (i = 0; i < n; i++) {
                if (busy[i]) continue;
                for (k = 0; k < allU.length; k++) {
                    var u = allU[k], ue = i + u.length;
                    if (s.substring(i, ue) !== u) continue;
                    var ex = s.charAt(ue);
                    var arabicU = inList(AR_UNITS, u);
                    if (!(ex === "2" || ex === "3" || arabicU && (ex === "\u0662" || ex === "\u0663" || ex === "\u06F2" || ex === "\u06F3"))) continue;
                    var prev = s.charAt(i - 1);
                    if (i > 0 && isLetter(prev)) continue;                      // Item2, Aim3
                    if (i > 0 && !(isSpace(prev) || isDigit(prev) || /[\/(\u00B7.\-\u2212\u00D7\u0660-\u0669]/.test(prev))) continue;
                    if (prev === "." && isLetter(s.charAt(i - 2))) continue;    // fichier.m2
                    if (!okAfter(ue + 1)) continue;
                    if (!free(i, ue + 1)) continue;
                    take(i, ue + 1); counts.unit++;
                    if (o.unitUnicode && SUP_DIG.hasOwnProperty(ex)) {
                        edits.push({ index: ue, type: "replace", ch: SUP_DIG[ex] });
                        example("unit", i, ue + 1, u + SUP_DIG[ex]);
                    } else {
                        pend.push({ start: ue, len: 1, kind: "sup", cat: "unit" });
                        example("unit", i, ue + 1, u + "^" + ex);
                    }
                    break;
                }
            }
        }

        // --- Exposants négatifs SI : m·s-2, kg·m-3, s-1 / negative SI exponents ---
        if (o.unitNeg) {
            var NG = /([A-Za-z\u00B5\u03BC]{1,3})([\-\u2212])([1-4])(?![0-9A-Za-z])/g;
            while ((m = NG.exec(s)) !== null) {
                var ga = m.index, gu = m[1], gs = ga + gu.length, gb = gs + 2;
                if (!inList(NEG_UNITS, gu)) continue;
                var gp = s.charAt(ga - 1);
                if (ga === 0 || !(gp === "\u00B7" || gp === "." || gp === "\u22C5" || gp === "\u2219" || gp === "/" || isSpace(gp))) continue;
                // le mot précédent doit être un nombre ou une unité / previous token must be a number or a unit
                var gq = ga - 1; while (gq >= 0 && (isSpace(s.charAt(gq)) || /[\u00B7.\u22C5\u2219\/]/.test(s.charAt(gq)))) gq--;
                var ge = gq + 1; while (gq >= 0 && (isWord(s.charAt(gq)) || s.charAt(gq) === "," && isDigit(s.charAt(gq - 1)))) gq--;
                var tok = s.substring(gq + 1, ge);
                var tokOk = /^\d+([.,]\d+)?$/.test(tok) || inList(NEG_UNITS, tok) || inList(UNITS, tok) ||
                    /[\u00B2\u00B3]$/.test(tok) && inList(NEG_UNITS.concat(UNITS), tok.substring(0, tok.length - 1));
                if (!tokOk || ge - (gq + 1) === 0 || ga - ge > 3) continue;
                if (gp === "." && !isLetter(s.charAt(ga - 2))) continue;     // 3.s-1 n'est pas une unité
                if (!free(ga, gb)) continue;
                take(ga, gb); counts.unitNeg++;
                if (m[2] === "-") edits.push({ index: gs, type: "replace", ch: "\u2212" });
                pend.push({ start: gs, len: 2, kind: "sup", cat: "unitNeg" });
                example("unitNeg", ga, gb, gu + "^\u2212" + m[3]);
            }
        }

        // --- Report des indices après les edits / map pending formats to post-edit indices ---
        var removed = [];
        for (k = 0; k < edits.length; k++) if (edits[k].type === "remove") removed.push(edits[k].index);
        removed.sort(function (x, y) { return x - y; });
        function mapIdx(idx) { var c = 0; for (var q = 0; q < removed.length && removed[q] < idx; q++) c++; return idx - c; }
        for (k = 0; k < pend.length; k++) {
            var P = pend[k], ns = mapIdx(P.start), ne = mapIdx(P.start + P.len);
            if (ne > ns) fmts.push({ start: ns, len: ne - ns, kind: P.kind, cat: P.cat, numLen: P.numLen });
        }
        fmts.sort(function (x, y) { return x.start - y.start; });
        // fusionne les plages contiguës de même nature (PM10 → une plage) / merge adjacent ranges
        var merged = [];
        for (k = 0; k < fmts.length; k++) {
            var L = merged.length ? merged[merged.length - 1] : null, F = fmts[k];
            if (L && L.kind === F.kind && L.cat === F.cat && F.kind !== "frac" && F.kind !== "mark" && L.start + L.len === F.start) L.len += F.len;
            else merged.push(F);
        }
        fmts = merged;
        edits.sort(function (x, y) { return x.index - y.index; });
        return { edits: edits, fmts: fmts, examples: examples, counts: counts };
    }

    // Applique les edits à une chaîne (pour contrôle) / applies edits to a string (for checking)
    function applyEdits(s, edits) {
        var arr = [], i;
        for (i = 0; i < s.length; i++) arr.push(s.charAt(i));
        var sorted = edits.slice(0);
        sorted.sort(function (a, b) { return b.index - a.index; });
        for (i = 0; i < sorted.length; i++) {
            var e = sorted[i];
            if (e.type === "replace") arr[e.index] = e.ch;
            else if (e.type === "remove") arr.splice(e.index, 1);
        }
        return arr.join("");
    }

    function parseList(t) {
        var out = [], parts = String(t || "").split(/[,;\s]+/);
        for (var i = 0; i < parts.length; i++) if (parts[i] && /^[A-Za-z0-9().]+$/.test(parts[i]) && /\d/.test(parts[i])) out.push(parts[i]);
        return out;
    }

    return { analyse: analyse, applyEdits: applyEdits, newCounts: newCounts, parseList: parseList,
        ordinalTarget: ordinalTarget, romanValue: romanValue, protectedMask: protectedMask, CHEM: CHEM };
})();

/* ===================================================================== */
/*  2. COUCHE ILLUSTRATOR / ILLUSTRATOR LAYER                             */
/* ===================================================================== */

var EI_FR = (function () {
    try { return String(app.locale || $.locale).toLowerCase().indexOf("fr") === 0; } catch (e) { return true; }
})();
function EI_t(fr, en) { return EI_FR ? fr : en; }

// Réglages par défaut / defaults
var EI_DEFAULTS = {
    scope: "sel", render: "auto", supSize: 60, supShift: 33, subSize: 60, subShift: -15,
    ord: true, ordFix: true, ordEn: true, abbr: true, abbrMeDr: false, numero: false,
    units: true, unitUnicode: false, unitNeg: false, chem: true, chemUnicode: false, chemList: "",
    marks: true, markConv: true, markSkipSmall: true, frac: false, fracMode: "opentype"
};

/* ---------- Réglages mémorisés (fichier local) / saved settings (local file) ---------- */
function EI_cfgFile() { return new File(Folder.userData + "/ExposantsIndices.cfg"); }
function EI_loadCfg() {
    var o = {}, k;
    for (k in EI_DEFAULTS) if (EI_DEFAULTS.hasOwnProperty(k)) o[k] = EI_DEFAULTS[k];
    try {
        var f = EI_cfgFile();
        if (f.exists && f.open("r")) {
            while (!f.eof) {
                var line = f.readln(), p = line.indexOf("=");
                if (p < 1) continue;
                k = line.substring(0, p); var v = line.substring(p + 1);
                if (!EI_DEFAULTS.hasOwnProperty(k)) continue;
                if (typeof EI_DEFAULTS[k] === "boolean") o[k] = (v === "true");
                else if (typeof EI_DEFAULTS[k] === "number") { var n = parseFloat(v); if (!isNaN(n)) o[k] = n; }
                else o[k] = v;
            }
            f.close();
        }
    } catch (e) {}
    return o;
}
function EI_saveCfg(o) {
    try {
        var f = EI_cfgFile();
        if (f.open("w")) { for (var k in EI_DEFAULTS) if (EI_DEFAULTS.hasOwnProperty(k)) f.writeln(k + "=" + o[k]); f.close(); }
    } catch (e) {}
}

// Options du cœur / core options
function EI_coreOpts(o, examples) {
    return { ord: o.ord, ordFix: o.ordFix, ordEn: o.ordEn, abbr: o.abbr, abbrMeDr: o.abbrMeDr, numero: o.numero,
        units: o.units, unitUnicode: o.unitUnicode, unitNeg: o.unitNeg, chem: o.chem, chemUnicode: o.chemUnicode,
        chemExtra: EI_CORE.parseList(o.chemList), marks: o.marks, markConv: o.markConv, frac: o.frac, fracMode: o.fracMode,
        examples: !!examples };
}

/* ---------- Objets modifiables / editable items ---------- */
function EI_editable(item) {
    try { if (item.locked || item.hidden) return false; } catch (e) {}
    try { if (item.editable === false) return false; } catch (e2) {}
    var p = null;
    try { p = item.parent; } catch (e3) {}
    while (p && p.typename !== "Document") {
        try {
            if (p.typename === "Layer") { if (p.locked || !p.visible) return false; }
            else if (p.locked || p.hidden) return false;
        } catch (e4) {}
        p = p.parent;
    }
    return true;
}
function EI_inLayer(item, layer) {
    var p = item.parent;
    while (p && p.typename !== "Document") { if (p === layer) return true; p = p.parent; }
    return false;
}
function EI_collectItems(items, out) {
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.typename === "TextFrame") out.push(it);
        else if (it.typename === "GroupItem") EI_collectItems(it.pageItems, out);
    }
}
function EI_key(tf) {
    var k = "";
    try { k = tf.position[0].toFixed(2) + "," + tf.position[1].toFixed(2) + "," + tf.contents.length; } catch (e) {}
    return k;
}

/* Cibles : { get(): TextRange, frame, fixed } ; blocs liés traités une fois / threads processed once */
function EI_targets(doc, scope, info) {
    var frames = [], targets = [], seen = {}, i;
    info.skipped = 0; info.noSel = false;
    if (scope === "sel") {
        var sel = doc.selection;
        if (sel && sel.typename === "TextRange") {
            var fr = null; try { fr = sel.story.textFrames[0]; } catch (e) {}
            targets.push({ get: (function (r) { return function () { return r; }; })(sel), frame: fr, fixed: true });
            return targets;
        }
        if (!sel || sel.length === 0) { info.noSel = true; return targets; }
        EI_collectItems(sel, frames);
    } else {
        var all = doc.textFrames, lay = doc.activeLayer;
        for (i = 0; i < all.length; i++) {
            if (scope === "layer" && !EI_inLayer(all[i], lay)) continue;
            frames.push(all[i]);
        }
    }
    for (i = 0; i < frames.length; i++) {
        var tf = frames[i];
        if (!EI_editable(tf)) { info.skipped++; continue; }
        var head = tf, guard = 0;
        try { while (head.previousFrame && guard++ < 500) head = head.previousFrame; } catch (e5) {}
        var threaded = false;
        try { threaded = head !== tf || !!head.nextFrame; } catch (e6) {}
        if (threaded) { var key = EI_key(head); if (seen[key]) continue; seen[key] = true; }
        targets.push({
            get: (function (h, th) { return function () { return th ? h.story.textRange : h.textRange; }; })(head, threaded),
            frame: head, fixed: false
        });
    }
    return targets;
}

/* ---------- Mesure des polices (copies vectorisées temporaires) / font probe ---------- */
/*  Vérifie si la police a de vrais exposants / indices / fractions OpenType et si elle dessine
 *  déjà ® ™ en petit, en vectorisant des copies temporaires à 100 pt sur un calque provisoire.
 *  Checks whether the font has real OpenType superiors / inferiors / fractions and whether it
 *  already draws ® ™ small, by outlining temporary 100 pt copies on a temporary layer. */
function EI_Probe(doc) {
    this.doc = doc; this.layer = null; this.cache = {};
}
EI_Probe.prototype.lay = function () {
    if (!this.layer) {
        this.layer = this.doc.layers.add();
        this.layer.name = "__ExposantsIndices_tmp";
    }
    return this.layer;
};
EI_Probe.prototype.measure = function (font, txt, setup) {
    var tf = null, g = null;
    try {
        tf = this.lay().textFrames.add();
        tf.contents = txt;
        var a = tf.textRange.characterAttributes;
        a.textFont = font; a.size = 100;
        if (setup) setup(a);
        g = tf.createOutline(); tf = null;
        var b = g.geometricBounds;
        var r = { h: b[1] - b[3], w: b[2] - b[0], top: b[1] };
        g.remove(); g = null;
        return r;
    } catch (e) {
        try { if (tf) tf.remove(); } catch (e1) {}
        try { if (g) g.remove(); } catch (e2) {}
        return null;
    }
};
EI_Probe.prototype.info = function (font) {
    var name = ""; try { name = font.name; } catch (e) {}
    if (this.cache.hasOwnProperty(name)) return this.cache[name];
    var I = { sup: false, sub: false, frac: false, small: {} };
    var n2 = this.measure(font, "2");
    if (n2 && n2.h > 0) {
        var s2 = this.measure(font, "2", function (a) { a.openTypePosition = FontOpenTypePositionOption.OPENTYPESUPERSCRIPT; });
        var b2 = this.measure(font, "2", function (a) { a.openTypePosition = FontOpenTypePositionOption.OPENTYPESUBSCRIPT; });
        I.sup = !!(s2 && s2.h > 0 && s2.h < n2.h * 0.85);
        I.sub = !!(b2 && b2.h > 0 && b2.h < n2.h * 0.85);
    }
    var nf = this.measure(font, "1/2");
    var ff = this.measure(font, "1/2", function (a) { a.fractions = true; });
    I.frac = !!(nf && ff && ff.h > 0 && (ff.h < nf.h * 0.9 || ff.w < nf.w * 0.85));
    var H = this.measure(font, "H");
    var marks = ["\u00AE", "\u2122", "\u2120"];
    for (var i = 0; i < marks.length; i++) {
        var m = H ? this.measure(font, marks[i]) : null;
        // déjà petit = moins de 62 % de la capitale H / already small = under 62 % of cap H
        I.small[marks[i]] = !!(m && H && H.h > 0 && m.h > 0 && m.h < H.h * 0.62);
    }
    this.cache[name] = I;
    return I;
};
EI_Probe.prototype.done = function () {
    try { if (this.layer) this.layer.remove(); } catch (e) {}
    this.layer = null;
};

/* ---------- Mise en forme / formatting ---------- */
function EI_rng(R, start, len) { var r = R.characters[start]; r.length = len; return r; }

// La plage est-elle déjà en exposant / indice / fraction ? / already formatted?
function EI_isFormatted(R, f) {
    try {
        var a = R.characters[f.start].characterAttributes;
        if (f.kind === "frac") {
            if (a.fractions === true) return true;
            if (R.characters[f.start + (f.numLen || 1)].contents === "\u2044") return true;
        }
        if (a.baselinePosition !== FontBaselineOption.NORMALBASELINE) return true;
        if (a.openTypePosition !== FontOpenTypePositionOption.OPENTYPEDEFAULT) return true;
        if (Math.abs(a.baselineShift) > 0.01) return true;
        if (f.start > 0) {
            var p = R.characters[f.start - 1].characterAttributes;
            if (a.size < p.size * 0.85) return true;
        }
    } catch (e) {}
    return false;
}

function EI_round(v) { return Math.round(v * 100) / 100; }

// Pose un exposant ou un indice / sets superscript or subscript
function EI_setPos(r, which, mode, o) {
    var a = r.characterAttributes;
    if (mode === "opentype") a.openTypePosition = which === "sup" ? FontOpenTypePositionOption.OPENTYPESUPERSCRIPT : FontOpenTypePositionOption.OPENTYPESUBSCRIPT;
    else if (mode === "manual") {
        var base = a.size;
        a.size = EI_round(base * (which === "sup" ? o.supSize : o.subSize) / 100);
        a.baselineShift = EI_round(base * (which === "sup" ? o.supShift : o.subShift) / 100);
    } else a.baselinePosition = which === "sup" ? FontBaselineOption.SUPERSCRIPT : FontBaselineOption.SUBSCRIPT;
}

function EI_fontOf(R, idx) { try { return R.characters[idx].characterAttributes.textFont; } catch (e) { return null; } }

// Applique une plage / applies one range ; renvoie / returns "done" | "small" | "skip"
function EI_applyFmt(R, f, o, probe) {
    if (EI_isFormatted(R, f)) return "skip";
    var font = EI_fontOf(R, f.start), I = null;
    function inf() { if (!I && font && probe) I = probe.info(font); return I || { sup: false, sub: false, frac: false, small: {} }; }
    if (f.kind === "mark" && o.markSkipSmall) {
        var ch = R.characters[f.start].contents;
        if (inf().small[ch]) return "small";
    }
    if (f.kind === "frac") {
        if (o.fracMode !== "manual" && inf().frac) { EI_rng(R, f.start, f.len).characterAttributes.fractions = true; return "done"; }
        // fraction manuelle / manual fraction : numérateur haut, barre de fraction, dénominateur réduit
        var nl = f.numLen || 1, size = R.characters[f.start].characterAttributes.size;
        var num = EI_rng(R, f.start, nl).characterAttributes;
        num.size = EI_round(size * 0.6); num.baselineShift = EI_round(size * 0.33);
        var sl = R.characters[f.start + nl];
        if (sl.contents === "/") sl.contents = "\u2044";
        EI_rng(R, f.start + nl + 1, f.len - nl - 1).characterAttributes.size = EI_round(size * 0.6);
        return "done";
    }
    var which = f.kind === "sub" ? "sub" : "sup", mode = o.render;
    if (mode === "auto") mode = (which === "sup" ? inf().sup : inf().sub) ? "opentype" : "illustrator";
    EI_setPos(EI_rng(R, f.start, f.len), which, mode, o);
    return "done";
}

// Remet une plage à la normale / resets one range
function EI_resetFmt(R, f) {
    var r = EI_rng(R, f.start, f.len), a = r.characterAttributes;
    a.baselinePosition = FontBaselineOption.NORMALBASELINE;
    a.openTypePosition = FontOpenTypePositionOption.OPENTYPEDEFAULT;
    a.baselineShift = 0;
    if (f.kind === "frac") a.fractions = false;
    // taille de référence : caractère précédent, sinon suivant ; pour une fraction, la barre
    // reference size: previous character, else next one; for a fraction, the slash too
    var ps = 0, i;
    try { if (f.start > 0) ps = R.characters[f.start - 1].characterAttributes.size; } catch (e1) {}
    try { if (!ps && f.start + f.len < R.characters.length) ps = R.characters[f.start + f.len].characterAttributes.size; } catch (e2) {}
    if (f.kind === "frac") for (i = 0; i < f.len; i++) ps = Math.max(ps, R.characters[f.start + i].characterAttributes.size);
    if (ps > 0) {
        for (i = 0; i < f.len; i++) {
            var c = R.characters[f.start + i].characterAttributes;
            if (c.size < ps * 0.85) c.size = ps;
        }
    }
}

/* ---------- Analyse / analysis (no changes) ---------- */
function EI_newTotals() { return { counts: EI_CORE.newCounts(), examples: [], todo: 0, already: 0, changed: 0, bad: 0, total: 0, frames: [] }; }

function EI_analyse(targets, o) {
    var T = EI_newTotals(), co = EI_coreOpts(o, true);
    T.total = targets.length;
    for (var i = 0; i < targets.length; i++) {
        var R = targets[i].get(), s = String(R.contents);
        if (R.characters.length !== s.length) { T.bad++; continue; }
        var r = EI_CORE.analyse(s, co), k, todo = r.edits.length ? 1 : 0;
        for (k in r.counts) if (r.counts.hasOwnProperty(k)) T.counts[k] += r.counts[k];
        for (k = 0; k < r.fmts.length; k++) {
            if (!r.edits.length && EI_isFormatted(R, r.fmts[k])) T.already++; else { T.todo++; todo = 1; }
        }
        if (todo) { T.changed++; if (targets[i].frame) T.frames.push(targets[i].frame); }
        for (k = 0; k < r.examples.length && T.examples.length < 14; k++) {
            var ex = r.examples[k], dup = false;
            for (var q = 0; q < T.examples.length; q++) if (T.examples[q].before === ex.before) dup = true;
            if (!dup) T.examples.push(ex);
        }
    }
    return T;
}

/* ---------- Application / apply ---------- */
function EI_applyTarget(T, o, totals, probe, reset) {
    var R = T.get(), s = String(R.contents), j;
    if (R.characters.length !== s.length) { totals.bad++; return; }
    var co = EI_coreOpts(o, false);
    if (reset) { co.markConv = false; co.unitUnicode = false; co.chemUnicode = false; co.fracMode = "opentype"; co.ordFix = false; co.numero = false; }
    var r = EI_CORE.analyse(s, co);
    if (reset) {
        for (j = 0; j < r.fmts.length; j++) { try { if (EI_isFormatted(R, r.fmts[j])) { EI_resetFmt(R, r.fmts[j]); totals.done++; } } catch (e0) { totals.errors++; } }
        return;
    }
    if (r.edits.length) {
        var ed = r.edits.slice(0);
        ed.sort(function (a, b) { return b.index - a.index; });
        for (j = 0; j < ed.length; j++) {
            var e = ed[j], c = R.characters[e.index];
            if (e.type === "replace") c.contents = e.ch;
            else if (e.type === "remove") c.remove();
        }
        var expected = EI_CORE.applyEdits(s, r.edits);
        if (!T.fixed) R = T.get();
        s = String(R.contents);
        if (s !== expected || R.characters.length !== s.length) { totals.mismatch++; return; }
        totals.edits += r.edits.length;
    }
    for (var k in r.counts) if (r.counts.hasOwnProperty(k)) totals.counts[k] += r.counts[k];
    for (j = 0; j < r.fmts.length; j++) {
        var res = "skip";
        try { res = EI_applyFmt(R, r.fmts[j], o, probe); } catch (e1) { totals.errors++; }
        if (res === "done") totals.done++; else if (res === "small") totals.small++; else totals.already++;
    }
}

/* ---------- Rapport / report ---------- */
function EI_report(c, extra) {
    var L = [];
    function line(fr, en, v) { if (v) L.push("\u2022 " + EI_t(fr, en) + " : " + v); }
    line("Ordinaux (1er, 2e, XIXe, 1st…)", "Ordinals (1st, 2e, XIXe…)", c.ord);
    line("  dont formes corrigées (2ème → 2e, 1ère → 1re)", "  of which fixed (2ème → 2e, 1ère → 1re)", c.ordFix);
    line("Abréviations (Mme, Mlle, Mgr, Cie…)", "Abbreviations (Mme, Mlle, Mgr, Cie…)", c.abbr);
    line("Unités au carré / au cube (m2, cm3, م2)", "Squared / cubed units (m2, cm3)", c.unit);
    line("Exposants négatifs (m·s-2)", "Negative exponents (m·s-2)", c.unitNeg);
    line("Formules chimiques (CO2, H2O…)", "Chemical formulas (CO2, H2O…)", c.chem);
    line("Marques ® ™ ℠", "Marks ® ™ ℠", c.mark + c.markConv);
    line("  dont (R) (TM) convertis", "  of which (R) (TM) converted", c.markConv);
    line("Fractions", "Fractions", c.frac);
    if (!L.length) L.push(EI_t("Rien trouvé avec ces réglages.", "Nothing found with these settings."));
    if (extra) L.push(extra);
    return L.join("\n");
}
function EI_examples(ex) {
    if (!ex.length) return "";
    var L = [EI_t("Exemples (^ = exposant, _ = indice) :", "Examples (^ = superscript, _ = subscript):")];
    for (var i = 0; i < ex.length && i < 8; i++) L.push("   " + ex[i].before + "  \u2192  " + ex[i].after);
    return L.join("\n");
}

/* ---------- Dialogue / dialog ---------- */
function EI_dialog(doc, o) {
    var w = new Window("dialog", EI_t("Exposants et indices automatiques", "Automatic superscripts & subscripts"));
    w.orientation = "column"; w.alignChildren = ["fill", "top"]; w.spacing = 8; w.margins = 14;

    var pS = w.add("panel", undefined, EI_t("Portée", "Scope"));
    pS.orientation = "row"; pS.margins = [10, 14, 10, 8];
    var rSel = pS.add("radiobutton", undefined, EI_t("Sélection", "Selection"));
    var rLay = pS.add("radiobutton", undefined, EI_t("Calque actif", "Active layer"));
    var rDoc = pS.add("radiobutton", undefined, EI_t("Document", "Document"));
    rSel.value = o.scope === "sel"; rLay.value = o.scope === "layer"; rDoc.value = o.scope === "doc";

    var pW = w.add("panel", undefined, EI_t("À mettre en forme", "What to format"));
    pW.alignChildren = ["left", "top"]; pW.margins = [10, 14, 10, 8]; pW.spacing = 4;
    var g1 = pW.add("group");
    var cOrd = g1.add("checkbox", undefined, EI_t("Ordinaux : 1er, 1re, 2e, XIXe, Ier, 2nd", "Ordinals: 1er, 2e, XIXe, 2nd"));
    var cFix = g1.add("checkbox", undefined, EI_t("corriger 2ème, 1ère, 3è", "fix 2ème, 1ère, 3è"));
    var cEn = g1.add("checkbox", undefined, EI_t("anglais 1st, 3rd, 4th", "English 1st, 3rd, 4th"));
    var g2 = pW.add("group");
    var cAbbr = g2.add("checkbox", undefined, EI_t("Abréviations : Mme, Mlle, Mgr, Cie, Vve", "Abbreviations: Mme, Mlle, Mgr, Cie, Vve"));
    var cMeDr = g2.add("checkbox", undefined, EI_t("Me, Dr", "Me, Dr"));
    var cNum = g2.add("checkbox", undefined, EI_t("n° → nº", "n° → nº"));
    var g3 = pW.add("group");
    var cUnit = g3.add("checkbox", undefined, EI_t("Unités au carré / au cube : m2, cm3, km2, م2", "Squared / cubed units: m2, cm3, km2"));
    var cUU = g3.add("checkbox", undefined, EI_t("en caractères ² ³", "as ² ³ characters"));
    var cNeg = pW.add("checkbox", undefined, EI_t("Exposants négatifs SI : m·s-2, kg·m-3, s-1 (le - devient −)", "Negative SI exponents: m·s-2, kg·m-3, s-1 (- becomes −)"));
    var g4 = pW.add("group");
    var cChem = g4.add("checkbox", undefined, EI_t("Formules chimiques : CO2, H2O, CH4, PM2.5…", "Chemical formulas: CO2, H2O, CH4, PM2.5…"));
    var cCU = g4.add("checkbox", undefined, EI_t("en caractères ₂", "as ₂ characters"));
    var g5 = pW.add("group");
    g5.add("statictext", undefined, EI_t("Autres formules :", "More formulas:"));
    var eChem = g5.add("edittext", undefined, o.chemList); eChem.characters = 34;
    eChem.helpTip = EI_t("Séparées par des virgules, ex. C8H10N4O2, Na2SO4", "Comma-separated, e.g. C8H10N4O2, Na2SO4");
    var g6 = pW.add("group");
    var cMark = g6.add("checkbox", undefined, EI_t("® ™ ℠ en exposant", "® ™ ℠ superscript"));
    var cConv = g6.add("checkbox", undefined, EI_t("(R) (TM) collés → ® ™", "attached (R) (TM) → ® ™"));
    var cSmall = g6.add("checkbox", undefined, EI_t("sauf si la police les dessine déjà petits", "unless the font already draws them small"));
    var g7 = pW.add("group");
    var cFrac = g7.add("checkbox", undefined, EI_t("Fractions 1/2, 3/4 (pas les dates ni 16/9)", "Fractions 1/2, 3/4 (not dates or 16/9)"));
    var ddFrac = g7.add("dropdownlist", undefined, [EI_t("OpenType (sinon manuelle)", "OpenType (else manual)"), EI_t("Caractères ½ ¾ si possible", "½ ¾ characters when possible"), EI_t("Manuelle", "Manual")]);
    var FM = ["opentype", "unicode", "manual"];
    ddFrac.selection = Math.max(0, (function () { for (var i = 0; i < FM.length; i++) if (FM[i] === o.fracMode) return i; return 0; })());
    cOrd.value = o.ord; cFix.value = o.ordFix; cEn.value = o.ordEn; cAbbr.value = o.abbr; cMeDr.value = o.abbrMeDr; cNum.value = o.numero;
    cUnit.value = o.units; cUU.value = o.unitUnicode; cNeg.value = o.unitNeg; cChem.value = o.chem; cCU.value = o.chemUnicode;
    cMark.value = o.marks; cConv.value = o.markConv; cSmall.value = o.markSkipSmall; cFrac.value = o.frac;

    var pR = w.add("panel", undefined, EI_t("Rendu des exposants et indices", "Superscript / subscript rendering"));
    pR.alignChildren = ["left", "top"]; pR.margins = [10, 14, 10, 8];
    var ddR = pR.add("dropdownlist", undefined, [
        EI_t("Auto : vrais exposants OpenType si la police en a (mesuré), sinon exposant d'Illustrator", "Auto: real OpenType superiors if the font has them (measured), else Illustrator superscript"),
        EI_t("Exposant / indice d'Illustrator (Fichier > Format du document > Texte)", "Illustrator superscript / subscript (File > Document Setup > Type)"),
        EI_t("OpenType forcé (Exposant / Indice)", "Forced OpenType (Superscript / Subscript)"),
        EI_t("Manuel : taille et décalage ci-dessous", "Manual: size and shift below")]);
    var RM = ["auto", "illustrator", "opentype", "manual"];
    ddR.selection = Math.max(0, (function () { for (var i = 0; i < RM.length; i++) if (RM[i] === o.render) return i; return 0; })());
    var gM = pR.add("group");
    gM.add("statictext", undefined, EI_t("Exposant : taille", "Superscript: size"));
    var eSS = gM.add("edittext", undefined, String(o.supSize)); eSS.characters = 4;
    gM.add("statictext", undefined, EI_t("% décalage", "% shift"));
    var eSH = gM.add("edittext", undefined, String(o.supShift)); eSH.characters = 4;
    gM.add("statictext", undefined, EI_t("%   Indice : taille", "%   Subscript: size"));
    var eBS = gM.add("edittext", undefined, String(o.subSize)); eBS.characters = 4;
    gM.add("statictext", undefined, EI_t("% décalage", "% shift"));
    var eBH = gM.add("edittext", undefined, String(o.subShift)); eBH.characters = 4;
    gM.add("statictext", undefined, "%");
    function syncM() { gM.enabled = ddR.selection && ddR.selection.index === 3; }
    ddR.onChange = syncM; syncM();
    pR.add("statictext", undefined, EI_t("Les objets verrouillés ou masqués sont ignorés. Travaillez sur une copie.", "Locked or hidden objects are skipped. Work on a copy."));

    var out = w.add("statictext", undefined, EI_t("Analyser compte et montre des exemples sans rien modifier.", "Analyse counts and shows examples without changing anything."), { multiline: true });
    out.preferredSize = [600, 190];

    var gB = w.add("group"); gB.alignment = ["right", "top"];
    var bAn = gB.add("button", undefined, EI_t("Analyser", "Analyse"));
    var bSel = gB.add("button", undefined, EI_t("Sélectionner les textes", "Select texts"));
    var bRes = gB.add("button", undefined, EI_t("Rétablir", "Reset"));
    bRes.helpTip = EI_t("Remet à la normale les exposants / indices / fractions des catégories cochées", "Removes superscripts / subscripts / fractions of the ticked categories");
    var bCancel = gB.add("button", undefined, EI_t("Fermer", "Close"), { name: "cancel" });
    var bOk = gB.add("button", undefined, EI_t("Appliquer", "Apply"), { name: "ok" });

    function num(e, def, lo, hi) { var n = parseFloat(String(e.text).replace(",", ".")); if (isNaN(n)) n = def; return Math.max(lo, Math.min(hi, n)); }
    function read() {
        o.scope = rSel.value ? "sel" : (rLay.value ? "layer" : "doc");
        o.ord = cOrd.value; o.ordFix = cFix.value; o.ordEn = cEn.value; o.abbr = cAbbr.value; o.abbrMeDr = cMeDr.value; o.numero = cNum.value;
        o.units = cUnit.value; o.unitUnicode = cUU.value; o.unitNeg = cNeg.value; o.chem = cChem.value; o.chemUnicode = cCU.value;
        o.chemList = String(eChem.text).replace(/[\r\n=]/g, " ");
        o.marks = cMark.value; o.markConv = cConv.value; o.markSkipSmall = cSmall.value; o.frac = cFrac.value;
        o.fracMode = FM[ddFrac.selection ? ddFrac.selection.index : 0];
        o.render = RM[ddR.selection ? ddR.selection.index : 0];
        o.supSize = num(eSS, 60, 20, 100); o.supShift = num(eSH, 33, -100, 100);
        o.subSize = num(eBS, 60, 20, 100); o.subShift = num(eBH, -15, -100, 100);
    }
    bAn.onClick = function () {
        read();
        var info = {}, T = EI_targets(doc, o.scope, info);
        if (!T.length) { out.text = EI_noTargetMsg(info); return; }
        var a = EI_analyse(T, o);
        var extra = EI_t(a.changed + " texte(s) sur " + a.total + " à modifier, " + a.todo + " mise(s) en forme à faire",
            a.changed + " of " + a.total + " text(s) to change, " + a.todo + " range(s) to format");
        if (a.already) extra += EI_t(", " + a.already + " déjà en forme", ", " + a.already + " already formatted");
        if (info.skipped) extra += EI_t(", " + info.skipped + " verrouillé(s) ou masqué(s) ignoré(s)", ", " + info.skipped + " locked/hidden skipped");
        if (a.bad) extra += EI_t(", " + a.bad + " ignoré(s) (caractères non indexables)", ", " + a.bad + " skipped (unindexable characters)");
        var ex = EI_examples(a.examples);
        out.text = EI_report(a.counts, extra + ".") + (ex ? "\n" + ex : "");
    };
    bSel.onClick = function () { read(); w.close(4); };
    bRes.onClick = function () { read(); w.close(3); };
    bOk.onClick = function () { read(); w.close(1); };
    return w.show();
}

function EI_noTargetMsg(info) {
    return info.noSel ? EI_t("Rien n'est sélectionné. Sélectionnez des blocs de texte (ou du texte avec l'outil Texte), ou choisissez Calque actif / Document.",
        "Nothing is selected. Select text frames (or text with the Type tool), or choose Active layer / Document.")
        : EI_t("Aucun texte modifiable dans cette portée.", "No editable text in this scope.");
}

/* ---------- Point d'entrée / entry point ---------- */
function EI_main() {
    if (app.documents.length === 0) {
        alert(EI_t("Aucun document ouvert. Ouvrez un document Illustrator puis relancez le script.",
            "No document is open. Open an Illustrator document and run the script again."));
        return;
    }
    var doc = app.activeDocument, o = EI_loadCfg();
    var res = EI_dialog(doc, o);
    if (res !== 1 && res !== 3 && res !== 4) return;
    EI_saveCfg(o);
    var info = {}, T = EI_targets(doc, o.scope, info), i;
    if (!T.length) { alert(EI_noTargetMsg(info)); return; }

    if (res === 4) {
        var a = EI_analyse(T, o);
        try { doc.selection = null; if (a.frames.length) doc.selection = a.frames; } catch (eS) {}
        app.redraw();
        alert(EI_t(a.frames.length + " texte(s) sélectionné(s) avec des exposants ou indices à poser.", a.frames.length + " text(s) selected with superscripts or subscripts to set."));
        return;
    }

    var totals = { counts: EI_CORE.newCounts(), done: 0, already: 0, small: 0, edits: 0, bad: 0, mismatch: 0, errors: 0 };
    var probe = new EI_Probe(doc);
    try {
        for (i = 0; i < T.length; i++) {
            try { EI_applyTarget(T[i], o, totals, probe, res === 3); } catch (e) { totals.errors++; }
        }
    } finally { probe.done(); }
    app.redraw();

    if (res === 3) {
        alert(EI_t(totals.done + " plage(s) remise(s) à la normale.", totals.done + " range(s) reset.") +
            (totals.errors ? EI_t(" " + totals.errors + " erreur(s).", " " + totals.errors + " error(s).") : "") +
            "\n" + EI_t("Ctrl+Z / Cmd+Z pour annuler.", "Ctrl+Z / Cmd+Z to undo."));
        return;
    }
    var extra = EI_t(totals.done + " mise(s) en forme posée(s)", totals.done + " range(s) formatted");
    if (totals.edits) extra += EI_t(", " + totals.edits + " caractère(s) corrigé(s)", ", " + totals.edits + " character(s) fixed");
    if (totals.already) extra += EI_t(", " + totals.already + " déjà en forme", ", " + totals.already + " already formatted");
    if (totals.small) extra += EI_t(", " + totals.small + " ® ™ laissé(s) (déjà petits dans la police)", ", " + totals.small + " ® ™ left (already small in the font)");
    if (info.skipped) extra += EI_t(", " + info.skipped + " verrouillé(s) ou masqué(s) ignoré(s)", ", " + info.skipped + " locked/hidden skipped");
    if (totals.bad) extra += EI_t(", " + totals.bad + " ignoré(s) (caractères non indexables)", ", " + totals.bad + " skipped (unindexable characters)");
    if (totals.mismatch) extra += EI_t(", " + totals.mismatch + " arrêté(s) par sécurité (résultat inattendu)", ", " + totals.mismatch + " stopped for safety (unexpected result)");
    if (totals.errors) extra += EI_t(", " + totals.errors + " erreur(s)", ", " + totals.errors + " error(s)");
    alert(EI_report(totals.counts, extra + ".\n" + EI_t("Ctrl+Z / Cmd+Z pour annuler.", "Ctrl+Z / Cmd+Z to undo.")));
}

if (typeof EI_NO_MAIN === "undefined") {
    try { EI_main(); } catch (err) { alert(EI_t("Erreur : ", "Error: ") + err + (err.line ? " (ligne " + err.line + ")" : "")); }
}
