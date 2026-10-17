// Tests sur objets Illustrator simulés (ne remplacent pas un essai réel dans Illustrator)
// Tests on simulated Illustrator objects (no substitute for a real run in Illustrator)
var FBO = { NORMALBASELINE: "NORMAL", SUPERSCRIPT: "SUP", SUBSCRIPT: "SUB" };
var FOP = { OPENTYPEDEFAULT: "OTDEF", OPENTYPESUPERSCRIPT: "OTSUP", OPENTYPESUBSCRIPT: "OTSUB", NUMERATOR: "NUM", DENOMINATOR: "DEN" };
var ctx = require("./load")({ FontBaselineOption: FBO, FontOpenTypePositionOption: FOP, TextType: { POINTTEXT: "P", AREATEXT: "A" } });
var pass = 0, fail = 0;
function eq(name, got, exp) { if (JSON.stringify(got) === JSON.stringify(exp)) pass++; else { fail++; console.log("ÉCHEC " + name + "\n  obtenu  " + JSON.stringify(got) + "\n  attendu " + JSON.stringify(exp)); } }

// --- Polices simulées / simulated fonts ---
var PRO = { name: "MinionPro-Regular", sup: true, sub: true, frac: true, smallMarks: false };
var BASIC = { name: "Arial-Regular", sup: false, sub: false, frac: false, smallMarks: false };
var SMALLR = { name: "Helvetica-Regular", sup: false, sub: false, frac: false, smallMarks: true };

// --- Texte simulé / simulated text ---
function attrs(font, size) { return { baselinePosition: FBO.NORMALBASELINE, openTypePosition: FOP.OPENTYPEDEFAULT, baselineShift: 0, size: size || 12, fractions: false, textFont: font || BASIC }; }
function clone(a) { var o = {}; for (var k in a) o[k] = a[k]; return o; }
function Story(text, font, size) { this.c = []; for (var i = 0; i < text.length; i++) this.c.push({ ch: text[i], a: attrs(font, size) }); }
var KEYS = ["baselinePosition", "openTypePosition", "baselineShift", "size", "fractions", "textFont"];
function Range(story, start, len) { this.s = story; this.start = start; this._len = len; }
Object.defineProperty(Range.prototype, "length", { get: function () { return this._len; }, set: function (v) { this._len = v; } });
Object.defineProperty(Range.prototype, "contents", {
    get: function () { return this.s.c.slice(this.start, this.start + this._len).map(function (x) { return x.ch; }).join(""); },
    set: function (v) {
        var tpl = this.s.c[this.start] ? this.s.c[this.start].a : attrs(), add = [];
        for (var i = 0; i < v.length; i++) add.push({ ch: v[i], a: clone(tpl) });
        Array.prototype.splice.apply(this.s.c, [this.start, this._len].concat(add)); this._len = v.length;
    }
});
Range.prototype.remove = function () { this.s.c.splice(this.start, this._len); this._len = 0; };
Object.defineProperty(Range.prototype, "characters", { get: function () {
    var self = this;
    return new Proxy({}, { get: function (t, k) {
        if (k === "length") return self.s.bad ? self._len + 1 : self._len;
        var n = Number(k); if (!isNaN(n)) { if (n < 0 || n >= self._len) throw new Error("index hors limites " + n); return new Range(self.s, self.start + n, 1); }
        return undefined;
    } });
} });
Object.defineProperty(Range.prototype, "characterAttributes", { get: function () {
    var self = this, o = {};
    KEYS.forEach(function (k) {
        Object.defineProperty(o, k, {
            get: function () { return self.s.c[self.start].a[k]; },
            set: function (v) { for (var i = self.start; i < self.start + self._len; i++) self.s.c[i].a[k] = v; }
        });
    });
    return o;
} });
function render(story) {
    // ^ exposant Illustrator, ° exposant OpenType, _ indice Illustrator, , indice OpenType, ~ fraction, * manuel
    return story.c.map(function (x) {
        var a = x.a, t = "";
        if (a.baselinePosition === FBO.SUPERSCRIPT) t = "^"; else if (a.baselinePosition === FBO.SUBSCRIPT) t = "_";
        else if (a.openTypePosition === FOP.OPENTYPESUPERSCRIPT) t = "°"; else if (a.openTypePosition === FOP.OPENTYPESUBSCRIPT) t = ",";
        else if (a.fractions) t = "~"; else if (a.baselineShift !== 0 || a.size < 12) t = "*";
        return t ? "[" + t + x.ch + "]" : x.ch;
    }).join("").replace(/\]\[([\^°_,~*])/g, function (m, g) { return ""; });
}
function cleanRender(story) {
    // fusionne les crochets successifs de même type pour lisibilité / merge adjacent brackets
    var out = "", cur = null, buf = "";
    story.c.forEach(function (x) {
        var a = x.a, t = "";
        if (a.baselinePosition === FBO.SUPERSCRIPT) t = "^"; else if (a.baselinePosition === FBO.SUBSCRIPT) t = "_";
        else if (a.openTypePosition === FOP.OPENTYPESUPERSCRIPT) t = "°"; else if (a.openTypePosition === FOP.OPENTYPESUBSCRIPT) t = ",";
        else if (a.fractions) t = "~"; else if (a.baselineShift !== 0 || a.size < 12) t = "*";
        if (t !== cur) { if (cur) out += "[" + cur + buf + "]"; buf = ""; cur = t; if (!t) cur = null; }
        if (t) buf += x.ch; else out += x.ch;
    });
    if (cur) out += "[" + cur + buf + "]";
    return out;
}

// --- Document simulé / simulated document ---
var layerCount = 0, outlined = 0;
function H(font, txt, a) {
    var h = 70, w = 50 * txt.length;
    if (txt === "2") { if (a.openTypePosition === FOP.OPENTYPESUPERSCRIPT && font.sup) h = 40; if (a.openTypePosition === FOP.OPENTYPESUBSCRIPT && font.sub) h = 40; }
    if (txt === "1/2" && a.fractions && font.frac) { h = 60; w = 60; }
    if (/[\u00AE\u2122\u2120]/.test(txt)) h = font.smallMarks ? 30 : 68;
    return { h: h, w: w };
}
function makeDoc(frames) {
    var doc = { typename: "Document", selection: [], textFrames: frames, activeLayer: null, layers: {
        add: function () {
            layerCount++;
            var L = { name: "", typename: "Layer", textFrames: { add: function () {
                var tf = { _c: "", a: attrs() };
                Object.defineProperty(tf, "contents", { set: function (v) { tf._c = v; }, get: function () { return tf._c; } });
                tf.textRange = { characterAttributes: tf.a };
                tf.remove = function () {};
                tf.createOutline = function () { outlined++; var m = H(tf.a.textFont, tf._c, tf.a); return { geometricBounds: [0, m.h, m.w, 0], remove: function () {} }; };
                return tf;
            } }, remove: function () { layerCount--; } };
            return L;
        } } };
    return doc;
}
var LAYER = { typename: "Layer", name: "Calque 1", locked: false, visible: true, parent: null };
function frame(text, font, extra) {
    var st = new Story(text, font);
    var f = { typename: "TextFrame", story: st, locked: false, hidden: false, parent: LAYER, position: [0, Math.random()], kind: "A", previousFrame: null, nextFrame: null };
    Object.defineProperty(f, "textRange", { get: function () { return new Range(st, 0, st.c.length); } });
    Object.defineProperty(f, "contents", { get: function () { return st.c.map(function (x) { return x.ch; }).join(""); } });
    for (var k in (extra || {})) f[k] = extra[k];
    return f;
}
function opts(over) { var o = {}, k; for (k in ctx.EI_DEFAULTS) o[k] = ctx.EI_DEFAULTS[k]; for (k in (over || {})) o[k] = over[k]; return o; }
function run(frames, o, reset) {
    var doc = makeDoc(frames), info = {}, T = ctx.EI_targets(doc, o.scope, info);
    var totals = { counts: ctx.EI_CORE.newCounts(), done: 0, already: 0, small: 0, edits: 0, bad: 0, mismatch: 0, errors: 0 };
    var probe = new ctx.EI_Probe(doc);
    try { for (var i = 0; i < T.length; i++) ctx.EI_applyTarget(T[i], o, totals, probe, !!reset); } finally { probe.done(); }
    totals.info = info; totals.targets = T.length; totals.probe = probe;
    return totals;
}

// 1. Rendu auto, police sans exposants OpenType → exposant Illustrator / auto, basic font
var f1 = frame("Le 1er mai, la 2ème édition, 120 m2 de CO2 pour Acme(R), Mme Dupont.", BASIC);
var r1 = run([f1], opts({ scope: "doc" }));
eq("auto/basique rendu", cleanRender(f1.story), "Le 1[^er] mai, la 2[^e] édition, 120 m[^2] de CO[_2] pour Acme[^®], M[^me] Dupont.");
eq("auto/basique compteurs", [r1.done, r1.edits, r1.errors, r1.mismatch], [6, 3 + 2, 0, 0]);
eq("calque provisoire supprimé", layerCount, 0);

// 2. Second passage : rien à refaire / second run does nothing
var r1b = run([f1], opts({ scope: "doc" }));
eq("idempotence", [r1b.done, r1b.edits, r1b.already], [0, 0, 6]);
eq("idempotence rendu", cleanRender(f1.story), "Le 1[^er] mai, la 2[^e] édition, 120 m[^2] de CO[_2] pour Acme[^®], M[^me] Dupont.");

// 3. Police avec vrais exposants → OpenType / pro font → OpenType
var f2 = frame("XIXe siècle, H2O, 3 cm3", PRO);
run([f2], opts({ scope: "doc" }));
eq("auto/pro rendu", cleanRender(f2.story), "XIX[°e] siècle, H[,2]O, 3 cm[°3]");

// 4. Mode Illustrator forcé / forced Illustrator mode
var f3 = frame("XIXe siècle, H2O", PRO);
run([f3], opts({ scope: "doc", render: "illustrator" }));
eq("illustrator forcé", cleanRender(f3.story), "XIX[^e] siècle, H[_2]O");

// 5. Manuel : taille et décalage / manual size & shift
var f4 = frame("le 2e et CO2", BASIC);
run([f4], opts({ scope: "doc", render: "manual", supSize: 60, supShift: 33, subSize: 50, subShift: -20 }));
var e = f4.story.c[4].a, c2 = f4.story.c[11].a;
eq("manuel exposant", [e.size, e.baselineShift], [7.2, 3.96]);
eq("manuel indice", [c2.size, c2.baselineShift], [6, -2.4]);
var r4b = run([f4], opts({ scope: "doc", render: "manual" }));
eq("manuel sans cumul", [r4b.done, f4.story.c[4].a.size], [0, 7.2]);

// 6. Rétablir / reset
run([f4], opts({ scope: "doc" }), true);
eq("rétablir manuel", [cleanRender(f4.story), f4.story.c[4].a.size, f4.story.c[4].a.baselineShift], ["le 2e et CO2", 12, 0]);
run([f1], opts({ scope: "doc" }), true);
eq("rétablir", cleanRender(f1.story), "Le 1er mai, la 2e édition, 120 m2 de CO2 pour Acme®, Mme Dupont.");

// 7. ® déjà petit dans la police / mark already small in the font
var f5 = frame("Acme\u00AE et Brand\u2122", SMALLR);
var r5 = run([f5], opts({ scope: "doc" }));
eq("® petit ignoré", [cleanRender(f5.story), r5.small], ["Acme\u00AE et Brand\u2122", 2]);
var f5b = frame("Acme\u00AE", SMALLR);
run([f5b], opts({ scope: "doc", markSkipSmall: false }));
eq("® petit forcé", cleanRender(f5b.story), "Acme[^\u00AE]");

// 8. Fractions : OpenType si la police les a, sinon manuelle / fractions
var f6 = frame("1/2 tasse le 17/10/2026", PRO);
run([f6], opts({ scope: "doc", frac: true }));
eq("fraction OpenType", cleanRender(f6.story), "[~1/2] tasse le 17/10/2026");
var f7 = frame("3/4 l", BASIC);
run([f7], opts({ scope: "doc", frac: true }));
eq("fraction manuelle (repli)", [f7.story.c.map(function (x) { return x.ch; }).join(""), f7.story.c[0].a.size, f7.story.c[0].a.baselineShift, f7.story.c[2].a.size, f7.story.c[2].a.baselineShift], ["3\u20444 l", 7.2, 3.96, 7.2, 0]);
var r7b = run([f7], opts({ scope: "doc", frac: true }));
eq("fraction manuelle sans cumul", r7b.done, 0);
run([f7], opts({ scope: "doc", frac: true }), true);
eq("fraction manuelle rétablie", [f7.story.c[0].a.size, f7.story.c[0].a.baselineShift, f7.story.c[2].a.size], [12, 0, 12]);
var f8 = frame("1/2 et 3/16", BASIC);
run([f8], opts({ scope: "doc", frac: true, fracMode: "unicode" }));
eq("fraction Unicode", f8.story.c.map(function (x) { return x.ch; }).join(""), "\u00BD et 3\u204416");

// 9. Unicode ² ₂ / Unicode characters
var f9 = frame("120 m2 de CO2", BASIC);
run([f9], opts({ scope: "doc", unitUnicode: true, chemUnicode: true }));
eq("Unicode ² ₂", cleanRender(f9.story), "120 m\u00B2 de CO\u2082");

// 10. Portées, verrouillés, liés, non indexables / scopes, locked, threaded, unindexable
var fa = frame("le 2e", BASIC), fb = frame("le 3e", BASIC, { locked: true }), fc = frame("le 4e", BASIC);
var fd = frame("le 5e", BASIC); fd.story.bad = true;
var LAY2 = { typename: "Layer", name: "Calque 2", locked: true, visible: true, parent: null };
var fe = frame("le 6e", BASIC, { parent: LAY2 });
var r10 = run([fa, fb, fc, fd, fe], opts({ scope: "doc" }));
eq("verrouillés ignorés", [r10.info.skipped, r10.targets, r10.bad, cleanRender(fb.story), cleanRender(fe.story), cleanRender(fd.story)], [2, 3, 1, "le 3e", "le 6e", "le 5e"]);
// blocs liés : un seul passage par article / threaded frames processed once
var shared = new Story("le 7e et le 8e", BASIC);
function tframe(prev) {
    var f = { typename: "TextFrame", locked: false, hidden: false, parent: LAYER, position: [5, 5], kind: "A", previousFrame: prev, nextFrame: null };
    f.story = { textRange: new Range(shared, 0, shared.c.length) };
    Object.defineProperty(f, "contents", { get: function () { return shared.c.map(function (x) { return x.ch; }).join(""); } });
    Object.defineProperty(f, "textRange", { get: function () { return new Range(shared, 0, 5); } });
    return f;
}
var t1 = tframe(null), t2 = tframe(t1); t1.nextFrame = t2;
Object.defineProperty(t1.story, "textRange", { get: function () { return new Range(shared, 0, shared.c.length); } });
var r11 = run([t1, t2], opts({ scope: "doc" }));
eq("liés : un article", [r11.targets, cleanRender(shared)], [1, "le 7[^e] et le 8[^e]"]);

// 11. Sélection vide / empty selection
var docE = makeDoc([]); docE.selection = []; var infE = {};
eq("rien de sélectionné", [ctx.EI_targets(docE, "sel", infE).length, infE.noSel], [0, true]);
eq("message sans sélection", /Rien n'est sélectionné/.test(ctx.EI_noTargetMsg(infE)), true);

// 12. Analyse sans modification / analysis changes nothing
var fz = frame("le 2ème et 1er, CO2", BASIC), before = JSON.stringify(fz.story.c);
var A = ctx.EI_analyse(ctx.EI_targets(makeDoc([fz]), "doc", {}), opts({ scope: "doc" }));
eq("analyse : rien modifié", JSON.stringify(fz.story.c) === before, true);
eq("analyse : comptes", [A.counts.ord, A.counts.ordFix, A.counts.chem, A.todo, A.changed, A.frames.length], [2, 1, 1, 3, 1, 1]);
eq("analyse : rapport", /Ordinaux/.test(ctx.EI_report(A.counts, "")) && /2ème/.test(ctx.EI_examples(A.examples)), true);

// 13. Réglages : lecture des nombres / settings round-trip keys
eq("défauts complets", Object.keys(ctx.EI_DEFAULTS).length, 23);

console.log("Simulation : " + pass + " réussis, " + fail + " échoués (sondes vectorisées : " + outlined + ")");
process.exitCode = fail ? 1 : 0;
