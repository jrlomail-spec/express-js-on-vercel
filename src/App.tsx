import React, { useMemo, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ==========================
// Données de base
// ==========================
const components = [
  'A. Charge de travail',
  'B. Reconnaissance au travail',
  'C. Soutien social des supérieurs',
  'D. Soutien social des collègues',
  'E. Autonomie décisionnelle',
  'F. Information et communication'
];

// Liste brute fournie (avec doublons provenant de la source)
const RAW_MANIFESTATIONS = [
  'Stress','Diminution du stress','Tristesse / Découragement','Plaisir au travail','Démotivation / Démobilisation','Motivation / mobilisation','Isolement / exclusion','Sentiment d’appartenance','Perte de sens','Sens au travail','Surcharge mentale','Meilleur équilibre de vie','Méfiance / Défiance','Confiance aux autres et à l’organisation','Perte d’activité','Créativité et prise d’initiative','Inertie (professionnelle)','Travail structuré','Agressivité','Bienveillance / empathie','Fatigue / lourdeur','Augmentation de l’énergie','Tension physique','Bien-être physique','Respiration courte','Meilleur équilibre de vie','Sueur froide','Bien-être physique','Irritabilité','Bienveillance / empathie','Impatience','Plaisir à la collaboration','Agitation physique','Performance','Codépendance à l’autre','Esprit d’équipe','Clans','Esprit d’équipe','Augmentations de rumeurs','Confiance aux autres et à l’organisation','Difficultés de concentration','Augmentation de la concentration','Trouble du sommeil / insomnie','Meilleur équilibre de vie','Désorganisation','Travail structuré','Perte de sens','Développement de compétences / habiletés','Démobilisation / Démotivation','Sentiment d’accomplissement'
];

// Déduplique en conservant l'ordre d'apparition
const manifestations = [...new Set(RAW_MANIFESTATIONS.map(s => s.trim()))];

const positiveWords = [
  'diminution','plaisir','motivation','sentiment','sens','meilleur','confiance',
  'créativité','travail structuré','bienveillance','augmentation','bien-être',
  'performance','esprit d’équipe','développement','accomplissement','concentration'
];

const INTENSITY_OPTIONS = [
  { value: '1', label: '1 - Léger' },
  { value: '2', label: '2 - Modéré' },
  { value: '3', label: '3 - Élevé' },
  { value: '4', label: '4 - Très élevé' },
];

function isPositiveLabel(label) {
  const l = label.toLowerCase();
  return positiveWords.some(w => l.includes(w));
}

// ==========================
// Composant principal
// ==========================
export default function RPSInterface() {
  const [data, setData] = useState({}); // Sélections: comp__manif => 'positive'|'negative'
  const [plan, setPlan] = useState({}); // Détails plan: comp__manif => { intensity, autonomy, note }
  const printRef = useRef(null);

  // Bloc DEV sécurisé (évite ReferenceError: process is not defined en navigateur)
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
    const seen = new Set();
    const dupes = [];
    for (const m of manifestations) { if (seen.has(m)) dupes.push(m); else seen.add(m); }
    if (dupes.length) { console.warn('Doublons détectés (dev):', dupes); }
    try {
      // "Tests"/assertions légers exécutés en DEV uniquement
      const setSize = new Set(RAW_MANIFESTATIONS.map(s=>s.trim())).size;
      console.assert(manifestations.length === setSize, 'La taille dédupliquée ne correspond pas.');
      console.assert(isPositiveLabel('Diminution du stress') === true, 'Diminution du stress devrait être positif');
      console.assert(isPositiveLabel('Bien-être physique') === true, 'Bien-être devrait être positif');
      console.assert(isPositiveLabel('Stress') === false, 'Stress devrait être négatif');
      console.assert(isPositiveLabel('Agressivité') === false, 'Agressivité devrait être négatif');
    } catch (e) {
      console.warn('Tests runtime: une assertion a échoué', e);
    }
  }

  const toggleManifestation = (comp, manif) => {
    setData(prev => {
      const key = `${comp}__${manif}`;
      const current = prev[key];
      const isPos = isPositiveLabel(manif);
      const newValue = current === undefined ? (isPos ? 'positive' : 'negative') : undefined;
      const next = { ...prev, [key]: newValue };

      // Maintien du plan d'action en cohérence
      if (newValue === undefined) {
        setPlan(p => { const { [key]: _, ...rest } = p; return rest; });
      } else {
        setPlan(p => ({ ...p, [key]: p[key] || { intensity: '2', autonomy: 'Limité', note: '' } }));
      }
      return next;
    });
  };

  const getColor = (comp, manif) => {
    const key = `${comp}__${manif}`;
    if (data[key] === 'positive') return 'bg-green-400 text-black';
    if (data[key] === 'negative') return 'bg-red-400 text-white';
    return 'bg-gray-100';
  };

  const countsByComp = useMemo(() => {
    const res = {};
    for (const comp of components) {
      let pos = 0, neg = 0;
      for (const manif of manifestations) {
        const val = data[`${comp}__${manif}`];
        if (val === 'positive') pos++;
        if (val === 'negative') neg++;
      }
      res[comp] = { pos, neg };
    }
    return res;
  }, [data]);

  const selectedForComp = (comp) => {
    const neg = [], pos = [];
    for (const manif of manifestations) {
      const k = `${comp}__${manif}`;
      const v = data[k];
      if (v === 'negative') neg.push({ manif, key: k, polarity: 'Négatif' });
      if (v === 'positive') pos.push({ manif, key: k, polarity: 'Positif' });
    }
    return { neg, pos };
  };

  // ==========================
  // Exports & Partage
  // ==========================
  const exportCSV = () => {
    try {
      const rows = [[ 'Composante','Manifestation','Polarité','Intensité','Autonomie','Note' ]];
      for (const comp of components) {
        for (const manif of manifestations) {
          const k = `${comp}__${manif}`;
          const v = data[k];
          if (!v) continue;
          const p = plan[k] || {};
          rows.push([
            comp,
            manif,
            v === 'positive' ? 'Positif' : 'Négatif',
            p.intensity || '',
            p.autonomy || '',
            (p.note || '').replace(/\n/g, ' ')
          ]);
        }
      }
      const csv = rows
        .map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

      // Fallback si download bloqué : propose une copie manuelle
      if (!('download' in HTMLAnchorElement.prototype)) throw new Error('download-attr-not-supported');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plan_action_RPS.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      // Fallback: ouvre une fenêtre avec le CSV en texte à copier
      const ok = confirm('Le téléchargement a été bloqué. Voulez-vous copier le CSV dans le presse-papiers ?');
      if (ok) {
        const rows = [[ 'Composante','Manifestation','Polarité','Intensité','Autonomie','Note' ]];
        for (const comp of components) {
          for (const manif of manifestations) {
            const k = `${comp}__${manif}`;
            const v = data[k];
            if (!v) continue;
            const p = plan[k] || {};
            rows.push([
              comp,
              manif,
              v === 'positive' ? 'Positif' : 'Négatif',
              p.intensity || '',
              p.autonomy || '',
              (p.note || '').replace(/\n/g, ' ')
            ]);
          }
        }
        const csvPlain = rows.map(r => r.join(';')).join('\n');
        navigator.clipboard?.writeText(csvPlain)
          .then(() => alert('CSV copié dans le presse-papiers.'))
          .catch(() => alert('Impossible de copier automatiquement. Un nouvel onglet va s’ouvrir pour copier manuellement.'));
        const w = window.open('', '_blank');
        if (w) { w.document.write(`<pre>${csvPlain.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</pre>`); }
      }
    }
  };

  const emailPlan = () => {
    // Construit le corps d'email, tente un mailto, sinon propose une copie
    let body = 'Plan d\'action RPS%0D%0A%0D%0A';
    for (const comp of components) {
      const { pos, neg } = countsByComp[comp] || { pos:0, neg:0 };
      body += `${encodeURIComponent(comp)}%20(Négatifs:%20${neg},%20Positifs:%20${pos})%0D%0A`;
      const { neg: negList, pos: posList } = selectedForComp(comp);
      const ordered = [...negList, ...posList];
      for (const item of ordered) {
        const p = plan[item.key] || {};
        body += `- ${encodeURIComponent(item.polarity)}%20:%20${encodeURIComponent(item.manif)}%20|%20Intensité:%20${p.intensity||''}%20|%20Autonomie:%20${encodeURIComponent(p.autonomy||'') }%20|%20Note:%20${encodeURIComponent(p.note||'') }%0D%0A`;
      }
      body += '%0D%0A';
    }
    const subj = encodeURIComponent("Plan d'action RPS");

    // Essai 1: navigation directe (moins sujette au blocage que window.open)
    try { window.location.href = `mailto:jrlomail@gmail.com?subject=${subj}&body=${body}`; } catch (_) {}

    // Affiche un lien mailto cliquable + fallback copie si le client mail est bloqué
    setTimeout(() => {
      const ok = confirm('Si votre client mail ne s\'ouvre pas, voulez-vous copier le contenu de l\'email ?');
      if (ok) {
        const plain = decodeURIComponent(body).replace(/%0D%0A/g, '\n');
        navigator.clipboard?.writeText(`Sujet: ${decodeURIComponent(subj)}\n\n${plain}`)
          .then(()=>alert('Contenu copié dans le presse-papiers.'))
          .catch(()=>alert('Copie automatique impossible. Un onglet va s\'ouvrir pour copier manuellement.'));
        const w = window.open('', '_blank');
        if (w) { w.document.write(`<p>Sujet: ${decodeURIComponent(subj)}</p><pre>${plain.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</pre>`); }
      }
    }, 300);
  };

  const printSection = () => {
    // Imprime uniquement la Partie 2 via un IFRAME caché (évite les popups bloquées)
    const node = printRef.current;
    if (!node) { alert('La section à imprimer est introuvable.'); return; }
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document; if (!doc) return;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8" />
      <title>Plan d’action RPS</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 16px; }
        h2, h3 { margin: 0 0 8px; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
        .row { display: grid; grid-template-columns: 1fr 160px 160px 1fr; gap: 8px; align-items: start; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px; }
        .label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
        .title { font-weight: 600; }
        textarea, select { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px; }
        @page { size: A4; margin: 16mm; }
      </style>
    </head><body>`);
    doc.write(node.innerHTML);
    doc.write('</body></html>');
    doc.close();

    const win = iframe.contentWindow;
    setTimeout(() => { win?.focus(); win?.print(); setTimeout(() => document.body.removeChild(iframe), 0); }, 100);
  };

  // ==========================
  // Rendu
  // ==========================
  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold">Évaluation des manifestations – Risques psychosociaux</h1>
      {components.map(comp => (
        <Card key={comp} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">{comp}</h2>
            <div className="text-sm text-muted-foreground">
              <span className="mr-2">Négatifs: <strong>{countsByComp[comp]?.neg || 0}</strong></span>
              <span>Positifs: <strong>{countsByComp[comp]?.pos || 0}</strong></span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {manifestations.map(manif => (
              <button
                key={`${comp}-${manif}`}
                onClick={() => toggleManifestation(comp, manif)}
                className={`rounded-xl p-2 text-sm ${getColor(comp, manif)} transition-colors border border-gray-200 hover:opacity-90`}
              >
                {manif}
              </button>
            ))}
          </div>
        </Card>
      ))}

      {/* PARTIE 2 — Plan d’action par composante */}
      <div ref={printRef} className="space-y-6 print:block">
        <h2 className="text-2xl font-bold mt-6">Plan d’action – par composante</h2>
        {components.map(comp => {
          const lists = selectedForComp(comp);
          const ordered = [...lists.neg, ...lists.pos];
          if (ordered.length === 0) return null;
          return (
            <Card key={`plan-${comp}`} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{comp}</h3>
                <div className="text-sm text-muted-foreground">
                  <span className="mr-2">Négatifs: <strong>{lists.neg.length}</strong></span>
                  <span>Positifs: <strong>{lists.pos.length}</strong></span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {ordered.map(item => (
                  <div key={item.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start border rounded-xl p-3">
                    <div className="md:col-span-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Manifestation ({item.polarity})</div>
                      <div className="font-medium">{item.manif}</div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-500">Intensité</label>
                      <select
                        className="w-full border rounded-lg p-2"
                        value={plan[item.key]?.intensity || '2'}
                        onChange={(e)=> setPlan(p=>({ ...p, [item.key]: { ...(p[item.key]||{}), intensity: e.target.value } }))}
                      >
                        {INTENSITY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-500">Autonomie</label>
                      <select
                        className="w-full border rounded-lg p-2"
                        value={plan[item.key]?.autonomy || 'Limité'}
                        onChange={(e)=> setPlan(p=>({ ...p, [item.key]: { ...(p[item.key]||{}), autonomy: e.target.value } }))}
                      >
                        {['Aucun','Limité','Total'].map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-5">
                      <label className="text-xs text-gray-500">Ce que je modifie / conserve pour cet impact</label>
                      <textarea
                        className="w-full border rounded-lg p-2 min-h-[64px]"
                        placeholder="Ex.: Je planifie des pauses, je délègue X, je maintiens Y…"
                        value={plan[item.key]?.note || ''}
                        onChange={(e)=> setPlan(p=>({ ...p, [item.key]: { ...(p[item.key]||{}), note: e.target.value } }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* PARTIE 3 — Export / partage */}
      <div className="flex flex-wrap gap-3 items-center justify-center mt-6 no-print">
        <Button onClick={exportCSV}>Exporter en CSV</Button>
        <Button onClick={emailPlan}>Envoyer par courriel</Button>
        <Button onClick={printSection}>Imprimer / Exporter PDF</Button>
      </div>

      {/* Styles d’impression globaux supprimés car on imprime via une fenêtre dédiée */}
    </div>
  );
}
