// Fonction « ttt-move » : vérifie chaque coup du morpion anime côté serveur.
// Le navigateur envoie seulement (partie, case, id du personnage AniList). Le serveur
// interroge AniList lui-même, contrôle les deux catégories de la case, puis écrit le coup.
// Les listes ROWS / COLS doivent rester identiques, dans le même ordre, à celles de index.html
// (l'état de la partie ne stocke que des numéros). Voir supabase/README.md.
import { createClient } from "npm:@supabase/supabase-js@2";

type Cat = { l: string; k: string; v?: string; a?: number; b?: number };

const ROWS: Cat[] = [{"l":"Pirates","k":"tag","v":"Pirates"},{"l":"Ninjas","k":"tag","v":"Ninja"},{"l":"Vampires","k":"tag","v":"Vampire"},{"l":"Magie","k":"tag","v":"Magic"},{"l":"École","k":"tag","v":"School"},{"l":"Militaire","k":"tag","v":"Military"},{"l":"Super-pouvoirs","k":"tag","v":"Super Power"},{"l":"Mechas","k":"tag","v":"Mecha"},{"l":"Super-héros","k":"tag","v":"Superhero"},{"l":"Samouraïs","k":"tag","v":"Samurai"},{"l":"Démons","k":"tag","v":"Demons"},{"l":"Dieux","k":"tag","v":"Gods"},{"l":"Espace","k":"tag","v":"Space"},{"l":"Détectives","k":"tag","v":"Detective"},{"l":"Post-apocalyptique","k":"tag","v":"Post-Apocalyptic"},{"l":"Voyage dans le temps","k":"tag","v":"Time Manipulation"},{"l":"Shōnen","k":"tag","v":"Shounen"},{"l":"Seinen","k":"tag","v":"Seinen"},{"l":"Shōjo","k":"tag","v":"Shoujo"},{"l":"Action","k":"genre","v":"Action"},{"l":"Romance","k":"genre","v":"Romance"},{"l":"Comédie","k":"genre","v":"Comedy"},{"l":"Horreur","k":"genre","v":"Horror"},{"l":"Sport","k":"genre","v":"Sports"},{"l":"Fantasy","k":"genre","v":"Fantasy"},{"l":"Science-fiction","k":"genre","v":"Sci-Fi"},{"l":"Mystère","k":"genre","v":"Mystery"},{"l":"Psychologique","k":"genre","v":"Psychological"},{"l":"Animes des années 90","k":"year","a":1990,"b":1999},{"l":"Animes des années 2000","k":"year","a":2000,"b":2009},{"l":"Animes des années 2010","k":"year","a":2010,"b":2019},{"l":"Animes depuis 2020","k":"year","a":2020,"b":2100},{"l":"Tiré d’un manga","k":"src","v":"MANGA"},{"l":"Tiré d’un light novel","k":"src","v":"LIGHT_NOVEL"},{"l":"Tiré d’un jeu vidéo","k":"src","v":"VIDEO_GAME"},{"l":"Anime original","k":"src","v":"ORIGINAL"},{"l":"Animes des années 80","k":"year","a":1980,"b":1989},{"l":"Aventure","k":"genre","v":"Adventure"},{"l":"Drame","k":"genre","v":"Drama"},{"l":"Tranche de vie","k":"genre","v":"Slice of Life"},{"l":"Surnaturel","k":"genre","v":"Supernatural"},{"l":"Thriller","k":"genre","v":"Thriller"},{"l":"Magical girl","k":"genre","v":"Mahou Shoujo"},{"l":"Musique","k":"genre","v":"Music"},{"l":"Isekai","k":"tag","v":"Isekai"},{"l":"Réincarnation","k":"tag","v":"Reincarnation"},{"l":"Zombies","k":"tag","v":"Zombies"},{"l":"Cyberpunk","k":"tag","v":"Cyberpunk"},{"l":"Extraterrestres","k":"tag","v":"Aliens"},{"l":"Robots","k":"tag","v":"Robots"},{"l":"Dragons","k":"tag","v":"Dragons"},{"l":"Fantômes","k":"tag","v":"Ghost"},{"l":"Idols","k":"tag","v":"Idol"},{"l":"Cuisine","k":"tag","v":"Food"},{"l":"Jeux d’argent","k":"tag","v":"Gambling"},{"l":"Arts martiaux","k":"tag","v":"Martial Arts"},{"l":"Combat à l’épée","k":"tag","v":"Swordplay"},{"l":"Boucle temporelle","k":"tag","v":"Time Loop"},{"l":"Steampunk","k":"tag","v":"Steampunk"},{"l":"Tragédie","k":"tag","v":"Tragedy"},{"l":"Héroïne principale","k":"tag","v":"Female Protagonist"},{"l":"Anti-héros","k":"tag","v":"Anti-Hero"},{"l":"Tsundere","k":"tag","v":"Tsundere"},{"l":"Yandere","k":"tag","v":"Yandere"},{"l":"Kuudere","k":"tag","v":"Kuudere"},{"l":"Métamorphes","k":"tag","v":"Shapeshifting"},{"l":"Sorcières","k":"tag","v":"Witch"},{"l":"Chats","k":"tag","v":"Cats"},{"l":"Anges","k":"tag","v":"Angels"},{"l":"Mythologie","k":"tag","v":"Mythology"},{"l":"Dystopie","k":"tag","v":"Dystopian"},{"l":"Guerre","k":"tag","v":"War"},{"l":"Politique","k":"tag","v":"Politics"},{"l":"Survie","k":"tag","v":"Survival"},{"l":"Vikings","k":"tag","v":"Vikings"},{"l":"Famille royale","k":"tag","v":"Royal Affairs"},{"l":"Jeu de la mort","k":"tag","v":"Death Game"},{"l":"Alchimie","k":"tag","v":"Alchemy"},{"l":"Nécromancie","k":"tag","v":"Necromancy"},{"l":"Course automobile","k":"tag","v":"Racing"},{"l":"Boxe","k":"tag","v":"Boxing"},{"l":"Football","k":"tag","v":"Football"},{"l":"Basket","k":"tag","v":"Basketball"},{"l":"Tennis","k":"tag","v":"Tennis"},{"l":"Baseball","k":"tag","v":"Baseball"},{"l":"Volley","k":"tag","v":"Volleyball"},{"l":"Natation","k":"tag","v":"Swimming"},{"l":"Jeux de cartes","k":"tag","v":"Card Battle"},{"l":"Jeux vidéo","k":"tag","v":"Video Games"},{"l":"Monde virtuel","k":"tag","v":"Virtual World"},{"l":"Intelligence artificielle","k":"tag","v":"Artificial Intelligence"},{"l":"Yakuza","k":"tag","v":"Yakuza"},{"l":"Police","k":"tag","v":"Police"},{"l":"Espionnage","k":"tag","v":"Espionage"},{"l":"Assassins","k":"tag","v":"Assassins"},{"l":"Yōkai","k":"tag","v":"Youkai"},{"l":"Kaiju","k":"tag","v":"Kaiju"}];
const COLS: Cat[] = [{"l":"Personnage féminin","k":"gender","v":"Female"},{"l":"Personnage masculin","k":"gender","v":"Male"},{"l":"Rôle principal","k":"main"},{"l":"Très populaire (3000+ favoris)","k":"pop"},{"l":"Apparaît dans 3 animes ou plus","k":"multi"}];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const refus = (reason: string, status = 200) => json({ ok: false, reason }, status);

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

const QD = `query($id:Int){Character(id:$id){id name{full} image{large} gender bloodType favourites
media(type:ANIME,perPage:50,sort:POPULARITY_DESC){edges{characterRole node{genres seasonYear source tags{name rank isMediaSpoiler}}}}}}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function respecte(c: Cat, d: any): boolean {
  const E = d.media.edges;
  switch (c.k) {
    case "tag": return E.some((e: any) => e.node.tags.some((t: any) => t.name === c.v && t.rank >= 50 && !t.isMediaSpoiler));
    case "genre": return E.some((e: any) => e.node.genres.includes(c.v));
    case "year": return E.some((e: any) => e.node.seasonYear >= c.a! && e.node.seasonYear <= c.b!);
    case "src": return E.some((e: any) => e.node.source === c.v);
    case "gender": return d.gender === c.v;
    case "main": return E.some((e: any) => e.characterRole === "MAIN");
    case "pop": return (d.favourites || 0) >= 3000;
    case "multi": return E.length >= 3;
    case "blood": return d.bloodType === c.v;
  }
  return false;
}

// Renvoie le personnage, null s'il n'existe pas, ou lève une erreur si AniList ne répond pas.
async function anilist(id: number, essais = 3): Promise<any | null> {
  const r = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QD, variables: { id } }),
  });
  if (r.status === 429 && essais > 1) {
    const attente = Math.min((Number(r.headers.get("Retry-After")) || 2) * 1000, 6000);
    await new Promise((f) => setTimeout(f, attente));
    return anilist(id, essais - 1);
  }
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("AniList " + r.status);
  const j = await r.json();
  if (j.errors) {
    if (j.errors.some((e: any) => e.status === 404)) return null;
    throw new Error(j.errors[0].message);
  }
  return j.data?.Character ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return refus("Méthode non autorisée", 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await asUser.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return refus("Connexion requise", 401);

    const body = await req.json().catch(() => null);
    const matchId = body?.match_id, cell = body?.cell, charId = body?.char_id;
    if (typeof matchId !== "string" || !Number.isInteger(cell) || cell < 0 || cell > 8 ||
        !Number.isInteger(charId) || charId < 1) return refus("Requête invalide", 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: m } = await admin.from("matches").select("*").eq("id", matchId).maybeSingle();
    if (!m || m.game !== "ttt" || (uid !== m.p1 && uid !== m.p2)) return refus("Partie introuvable", 404);
    if (m.status !== "playing") return refus("Partie terminée");

    const st = m.state;
    const pi = uid === m.p1 ? 0 : 1;
    if (!st || !Array.isArray(st.b) || st.b.length !== 9 || !Array.isArray(st.ri) || !Array.isArray(st.ci)) return refus("État invalide");
    if (st.over || st.rs === 0 || st.rs === 1) return refus("Partie terminée");
    if (st.turn !== pi) return refus("Ce n’est pas ton tour.");
    if (st.b[cell]) return refus("Case déjà jouée.");
    if ((st.used ?? []).includes(charId)) return refus("Personnage déjà utilisé.");

    const ligne = ROWS[st.ri[Math.floor(cell / 3)]];
    const colonne = COLS[st.ci[cell % 3]];
    if (!ligne || !colonne) return refus("État invalide");

    let d;
    try { d = await anilist(charId); } catch (e) {
      return json({ ok: false, retry: true, reason: "AniList ne répond pas : " + (e as Error).message });
    }
    if (!d) return json({ ok: true, valid: false, name: "Personnage inconnu" });
    if (!respecte(ligne, d) || !respecte(colonne, d)) return json({ ok: true, valid: false, name: d.name.full });

    // Coup valide : on construit le nouvel état, exactement dans la forme attendue par ttt_guard.
    const b = [...st.b];
    b[cell] = { p: pi, name: String(d.name.full).slice(0, 60), img: d.image?.large ?? null };
    const gagne = LINES.some((l) => l.every((x) => b[x] && b[x].p === pi));
    const plein = b.every(Boolean);
    const neuf = {
      ...st,
      b,
      used: [...(st.used ?? []), charId],
      miss: 0,
      seq: (st.seq ?? 0) + 1,
      over: gagne || plein,
      w: gagne ? pi : plein ? "d" : null,
      turn: gagne || plein ? pi : 1 - pi,
    };
    const { data: maj } = await admin.from("matches").update({ state: neuf })
      .eq("id", m.id).eq("status", "playing").filter("state->>seq", "eq", String(st.seq ?? 0)).select("id");
    if (!maj || maj.length === 0) return refus("La partie a changé, réessaie.");
    return json({ ok: true, valid: true, name: d.name.full, state: neuf });
  } catch (e) {
    return json({ ok: false, reason: "Erreur serveur : " + (e as Error).message }, 500);
  }
});
