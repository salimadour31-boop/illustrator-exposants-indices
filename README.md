# Exposants et indices automatiques — script Adobe Illustrator

**ExposantsIndices.jsx** v1.0.0 — repère selon le contexte et met en forme en une passe les ordinaux (1er, 2e, XIXe, 1st), les abréviations françaises (Mme, Mlle, Mgr, Cie), les unités au carré / au cube (m2, cm3, م2), les formules chimiques (CO2, H2O, PM2.5), les marques ® ™ et les vraies fractions, avec les vrais exposants OpenType de la police quand elle en a.
*Finds and formats ordinals, French abbreviations, squared units, chemical formulas, ® ™ marks and fractions in one pass, using the font's real OpenType superiors when it has them (FR/EN dialog).*

## Le problème

InDesign règle ces cas avec des styles GREP. **Illustrator n'a ni GREP, ni styles GREP**, et son Rechercher / Remplacer ne sait pas changer la mise en forme. Sur un menu, une affiche, un emballage ou une plaquette immobilière, chaque « 1er », « XIXe », « Mme », « 120 m2 », « CO2 », « Marque® » ou « 1/2 » doit être sélectionné à la main, lettre par lettre, puis passé en exposant ou en indice. Les textes reçus des clients contiennent en plus des formes fautives (« 2ème », « 1ère », « 3è ») et des « (R) » tapés au clavier. Le bouton OpenType « Ordinaux » d'Illustrator ne connaît que les ordinaux anglais de certaines polices, et le bouton « Fractions » appliqué à un bloc transforme aussi les dates (17/10/2026).

## Ce que fait le script

Sur la sélection (blocs ou texte sélectionné à l'outil Texte), le calque actif ou tout le document :

| Catégorie | Exemples | Résultat |
|---|---|---|
| Ordinaux français | 1er, 1re, 1ers, 2e, 2es, 2nd, 2nde, XIXe, Ier, Ve | suffixe en exposant |
| Formes fautives (option) | 2ème, 2ième, 2eme, 3è, 1ère, XIXème | corrigées en 2e, 3e, 1re, XIXe (règle de l'Imprimerie nationale) |
| Ordinaux anglais (option) | 1st, 22nd, 3rd, 11th | suffixe en exposant (11st, 2th refusés) |
| Abréviations | Mme, Mmes, Mlle, Mlles, Mgr, Cie, Vve ; en option Me (devant un nom propre), Dr (sans point), n° → nº | lettres finales en exposant |
| Unités | m2, cm3, km2, mm2, ft2, م2, سم2, كم٢ | puissance en exposant, ou caractères ² ³ (option) |
| Exposants négatifs SI (option) | m·s-2, kg·m-3, 10 s-1, W m-2 | « −2 » en exposant, trait d'union remplacé par le vrai signe moins |
| Formules chimiques | CO2, CO2e, H2O, CH4, NO2, SO2, NH3, O3, PM2.5, PM10, C6H12O6, Ca(OH)2… (≈ 70 formules) + vos formules | chiffres en indice, ou caractères ₂ (option) |
| Marques | ®, ™, ℠, et « Marque(R) », « Marque(TM) » collés | en exposant ; © n'est jamais touché |
| Fractions (option) | 1/2, 3/4, 1 1/2, 7/8, 3/16 | fraction OpenType, caractères ½ ¾ ⅓, ou fraction manuelle |

**Garde-fous** : rien n'est touché dans les URL, e-mails, mots-dièse, couleurs `#4e4e4e`, noms de fichiers et identifiants avec `_` ; ni dans les références et codes (A4, B2B, H1N1, R2D2, M2, Item2, U2, K2, V8), ni dans la notation scientifique (3e8, 2e-3), ni dans les mots courants qui ressemblent à des romains (Le, De, Ce, Me, Mme…). Les fractions ne sont prises que si elles sont « vraies » (numérateur plus petit que le dénominateur, dénominateur courant) : jamais les dates (17/10/2026), 24/7, 16/9, 4/3 ou 1/2.5. Les exposants négatifs exigent une unité ou un nombre avant (« Classe A-1 » reste tel quel).

**Rendu** au choix :
- **Auto** (par défaut) : le script vérifie, pour chaque police utilisée, si elle a de vrais exposants et indices OpenType (il vectorise en coulisse un « 2 » normal et un « 2 » en position OpenType sur un calque provisoire et compare les hauteurs). Si oui, il les utilise (dessin plus gras et mieux proportionné) ; sinon, il utilise l'exposant d'Illustrator ;
- **Exposant / indice d'Illustrator** (taille et position réglées dans Fichier > Format du document > Texte) ;
- **OpenType forcé** ;
- **Manuel** : taille et décalage en % du corps (60 % / +33 % pour l'exposant, 60 % / −15 % pour l'indice par défaut).

Pour les marques, le script mesure aussi ® ™ ℠ dans chaque police et les laisse tels quels si la police les dessine déjà petits (moins de 62 % de la capitale H), pour éviter les ® minuscules. Pour les fractions, le mode OpenType retombe sur une fraction manuelle (numérateur haut, barre de fraction U+2044, dénominateur réduit) si la police n'a pas de fractions.

**Boutons** : **Analyser** compte les cas par catégorie et montre des exemples avant → après sans rien modifier ; **Sélectionner les textes** sélectionne les blocs qui ont encore quelque chose à mettre en forme ; **Rétablir** remet à la normale les exposants, indices et fractions des catégories cochées (utile pour changer de rendu) ; **Appliquer**. Un second passage ne refait rien : les plages déjà en exposant, en indice, décalées ou réduites sont ignorées (pas de cumul en mode manuel).

Chaque caractère garde sa police, sa couleur et ses attributs. Les objets verrouillés ou masqués, et ceux des calques verrouillés ou masqués, sont ignorés. Les blocs liés sont traités une fois par article. Avant toute modification du contenu, le script vérifie que le texte et ses caractères correspondent un pour un, puis compare le résultat au résultat attendu et s'arrête sur ce bloc en cas d'écart. Les réglages sont mémorisés dans un petit fichier local (dossier des données utilisateur).

Limites : **Rétablir** ne défait pas les conversions de caractères (2ème → 2e, (R) → ®, ² ₂ ½, n° → nº) ; utilisez Ctrl+Z / Cmd+Z juste après l'application. Le texte arabe n'est concerné que par les unités (م2) ; les autres règles visent le français et l'anglais.

## Pourquoi c'est nouveau

Vérifié le 17 octobre 2026 :

- **Illustrator** : pas de GREP ni de styles GREP (Adobe Community, fil RUDTP « Сделать автозамену по тексту м2 на м² » : « dans Illustrator, visiblement aucun moyen ») ; le bouton OpenType Ordinaux dépend de la police et ne gère pas les ordinaux français ; le bouton Fractions s'applique à tout le bloc, dates comprises.
- **Scripts existants** : seulement des extraits de quelques lignes sur Adobe Community et RUDTP qui passent un caractère fixe en exposant (tous les « ® », ou le « 2 » qui suit un « m » dans un seul bloc), sans contexte ni garde-fous, sans ordinaux, chimie, fractions ni choix du rendu.
- **GitHub** : recherche de code `FontBaselineOption.SUPERSCRIPT` et `openTypePosition` dans les .jsx : uniquement ai2html et ai2svelte (export HTML qui lit les exposants existants), des bibliothèques d'auto-complétion et des tests d'attributs ; aucun dépôt « superscript illustrator ». Rien chez creold, Hiroyuki Sato, John Wundes, Alexander Ladygin, wckdtall, Kelso Cartography, Josh Duncan, sttk3, ni dans vexy-illustrator-scripts.
- **Ailleurs** : la solution courante est InDesign (styles GREP, astuce CreativePro « Quick GREP To Superscript Ordinals »).
- Distinct de TypographieFrancaise.jsx (espaces insécables) et AccentuerCapitales.jsx (accents) du même auteur.

Rejeté cette exécution car déjà existant : ajustement d'un titre arabe à une largeur par kashidas (Kashida Pro d'aescripts pour Illustrator, Kashida Plus en ligne, fonction native Kashidas pour le texte justifié) ; contrôle de cohérence d'un jeu d'icônes (Icon Consistency Checker et Design Pulse pour Figma, scripts Pixeden).

## Installation

- **Ponctuelle** : Fichier > Scripts > Autre script…, puis choisir `ExposantsIndices.jsx`.
- **Permanente** : copier le fichier dans le dossier `Presets/<langue>/Scripts` d'Illustrator (par exemple `Adobe Illustrator 2026/Presets/fr_FR/Scripts`), puis redémarrer Illustrator. Le script apparaît dans Fichier > Scripts.

## Utilisation

1. Travaillez sur une **copie** du document.
2. Sélectionnez des blocs de texte (ou du texte avec l'outil Texte), ou rien et choisissez Calque actif ou Document.
3. Lancez le script, cochez les catégories, choisissez le rendu, cliquez sur **Analyser** pour voir les exemples.
4. Cliquez sur **Appliquer**. Ctrl+Z / Cmd+Z annule ; selon la version d'Illustrator, plusieurs annulations peuvent être nécessaires.

Astuce : ajoutez vos propres formules (caféine C8H10N4O2, Na2SO4…) dans le champ « Autres formules », séparées par des virgules.

## Version cible et statut des tests

- Cible : Adobe Illustrator CC 2018 et versions récentes (ExtendScript ES3), Windows et macOS.
- **Non testé dans Illustrator.**
- Vérifié : syntaxe ES3 et ES5 (acorn) ; 78 tests du moteur texte dont 3 000 textes aléatoires (second passage sans modification, plages valides et sur les bons caractères) ; 28 tests sur des objets Illustrator simulés (rendu auto selon la police, Illustrator, OpenType, manuel sans cumul, Rétablir, ® déjà petit, fractions OpenType / manuelle / Unicode, caractères ² ₂, objets verrouillés, blocs liés, texte non indexable, analyse sans modification, calque provisoire supprimé). Ces simulations ne remplacent pas un essai réel.

```
node tests/test-core.js
node tests/test-simulation.js
```

## Licence

MIT © Amirouche Amwanes. Aucun appel réseau, aucune collecte de données.

---

### English summary

ExposantsIndices.jsx finds, in context, French and English ordinals (and fixes 2ème/1ère/3è), French abbreviations, squared/cubed units (including Arabic م2), negative SI exponents, chemical formulas, ® ™ ℠ marks and real fractions, and formats them in one pass, while leaving URLs, codes (A4, B2B, H1N1), dates and scientific notation alone. Rendering is Auto (real OpenType superiors/inferiors when the font has them, measured on hidden outlined copies, else Illustrator superscript), Illustrator, forced OpenType or manual size/shift. Analyse, Select texts, Reset and Apply buttons; re-running changes nothing. Not tested in Illustrator; syntax and logic tested in Node on simulated objects.
