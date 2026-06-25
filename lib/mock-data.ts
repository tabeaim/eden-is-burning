import type {
  Character,
  Location,
  Player,
  Post,
  Scene,
  SceneQuote,
} from "./types";
import { LOCATION_SUGGESTIONS } from "./world";

// Hilfsfunktion: ISO-Zeitstempel vor N Stunden (für realistische last_seen / Post-Zeiten)
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

// "Seed"-Daten — entspricht dem Beispieldaten-Abschnitt der Spezifikation.
// Diese Funktion liefert frische Kopien, damit der In-Memory-Store sie
// gefahrlos mutieren kann.

export function seedPlayers(): Player[] {
  return [
    {
      id: "p_tabs",
      username: "tabs",
      email: "tabeaim@gmail.com",
      avatar_url: "https://picsum.photos/seed/tabsavatar/200/200",
      bio: "Spielt Elliot und Nigel. Liebt langsame Szenen und nasse Cafés.",
      created_at: "2021-10-01T10:00:00Z",
      last_seen: hoursAgo(1),
      current_location: {
        path: "/dashboard",
        label: "Dashboard",
        at: hoursAgo(1),
      },
    },
    {
      id: "p_vera",
      username: "Vera",
      email: "vera@example.com",
      avatar_url: "https://picsum.photos/seed/veraavatar/200/200",
      bio: "Spielt Julius und Alexander.",
      created_at: "2021-10-03T10:00:00Z",
      last_seen: hoursAgo(0.15),
      current_location: {
        path: "/szenen/s_cafe",
        label: "Szene: Das Café und die Stille dazwischen",
        at: hoursAgo(0.15),
      },
    },
  ];
}

export function seedCharacters(): Character[] {
  return [
    {
      id: "c_elliot",
      player_id: "p_tabs",
      name: "Elliot Simmons",
      faceclaim: "Austin Butler",
      faceclaim_image_url: "https://picsum.photos/seed/austinb44/400/600",
      tagline: "brand new moral code",
      role: "student & future ceo",
      age: 23,
      area: "belle_view",
      bio: "Einst Golden Boy der Sutton Academy. Jetzt zurück in Eden mit einem pathologischen Hunger nach Macht, dem jeglicher Skrupel so nahrhaft erscheint wie eine einzige labbrige Gurkenscheibe.",
      pinterest_url: "https://pinterest.com/elliotsimmons",
      created_at: "2021-10-05T10:00:00Z",
      height: "188cm",
      figure: "athletisch",
      hair: "dunkelblond",
      eyes: "eisblau",
      full_name: "Elliot Alexander Simmons",
      sexuality: "kompliziert",
      status: "alleinstehend",
      origin: "Eden, Virginia",
      job: "Student & angehender CEO",
      company: "Simmons Holding",
      quote: "the ends justify the means.",
      personality:
        "Charmant, berechnend, geduldig. Elliot spielt langfristig — jede Geste hat einen Zweck, jedes Lächeln eine Funktion. Loyalität kennt er nur sich selbst gegenüber.",
    },
    {
      id: "c_nigel",
      player_id: "p_tabs",
      name: "Nigel Sinclair",
      faceclaim: null,
      faceclaim_image_url: "https://picsum.photos/seed/nigelsinc/400/600",
      tagline: null,
      role: "journalist",
      age: 28,
      area: "rivers_edge",
      bio: "Investigativer Journalist mit zu vielen offenen Akten und zu wenig Schlaf.",
      pinterest_url: null,
      created_at: "2021-10-06T10:00:00Z",
      height: "185cm",
      figure: "hager",
      hair: "dunkelbraun",
      eyes: "grau",
      full_name: "Nigel Sinclair",
      sexuality: "hetero",
      status: "geschieden",
      origin: "Oak Hill, Eden",
      job: "Investigativjournalist",
      company: "Eden Tribune",
      quote: "follow the money.",
      personality:
        "Misstrauisch, beharrlich, von einem altmodischen Sinn für Gerechtigkeit getrieben. Schläft schlecht, trinkt zu viel Kaffee, gibt niemals eine Spur auf.",
    },
    {
      id: "c_julius",
      player_id: "p_vera",
      name: "Julius Andrade",
      faceclaim: "Oscar Isaac",
      faceclaim_image_url: "https://picsum.photos/seed/oscarisc/400/600",
      tagline: "see your shape in the dark",
      role: "musikproduzent",
      age: 29,
      area: "rivers_edge",
      bio: "Schreibt Musik für andere, nie für sich. Lebt in einem stillen Apartment über dem Record Store in Rivers Edge.",
      pinterest_url: "https://pinterest.com/juliusandrade",
      created_at: "2021-10-07T10:00:00Z",
      height: "180cm",
      figure: "schlank",
      hair: "schwarz",
      eyes: "dunkelbraun",
      full_name: "Julius James Andrade",
      sexuality: "bisexuell",
      status: "es ist kompliziert",
      origin: "irgendwo zwischen zwei Akkorden",
      job: "Musikproduzent",
      company: "Freelance",
      quote: "see your shape in the dark.",
      personality:
        "Still, beobachtend, ein wenig melancholisch. Sagt mehr mit Pausen als mit Worten. Lässt Menschen nah heran und bereut es meistens.",
    },
    {
      id: "c_alexander",
      player_id: "p_vera",
      name: "Alexander Voss",
      faceclaim: null,
      faceclaim_image_url: "https://picsum.photos/seed/alexvoss/400/600",
      tagline: null,
      role: "anwalt",
      age: 35,
      area: "orchid_valley",
      bio: "Strafverteidiger aus altem Geld. Verliert selten — vor Gericht wie privat.",
      pinterest_url: null,
      created_at: "2021-10-08T10:00:00Z",
      height: "190cm",
      figure: "athletisch",
      hair: "dunkelbraun, ergrauend",
      eyes: "grün",
      full_name: "Alexander Maximilian Voss",
      sexuality: "hetero",
      status: "verheiratet",
      origin: "Orchid Valley, Eden",
      job: "Strafverteidiger",
      company: "Voss & Partner",
      quote: "everyone deserves a defense. mine costs more.",
      personality:
        "Kontrolliert, eloquent, eiskalt unter Druck. Behandelt das Leben wie einen Prozess, den er zu gewinnen gedenkt — koste es, wen es wolle.",
    },
  ];
}

export function seedScenes(): Scene[] {
  return [
    {
      id: "s_cafe",
      title: "Das Café und die Stille dazwischen",
      location_area: "rivers_edge",
      location_name: "Café Marlowe",
      inplay_date: "2021-11-22",
      inplay_time: "Nachmittag",
      status: "active",
      trigger_warning: false,
      created_at: "2021-11-22T14:00:00Z",
      participant_ids: ["c_elliot", "c_julius"],
      summary:
        "Zwei, die sich nicht ansehen, sitzen im verregneten Café nebeneinander.",
    },
    {
      id: "s_shades",
      title: "shades of yesterday",
      location_area: "orchid_valley",
      location_name: "Simmons Anwesen",
      inplay_date: "2021-11-15",
      inplay_time: "Abend",
      status: "closed",
      trigger_warning: false,
      created_at: "2021-11-15T19:00:00Z",
      participant_ids: ["c_elliot", "c_nigel"],
      summary:
        "Ein altes Geheimnis kommt auf dem Simmons-Anwesen wieder hoch — und endet im Streit.",
    },
    {
      id: "s_river",
      title: "Ein Umschlag, kein Absender",
      location_area: "rivers_edge",
      location_name: "Ron's Diner",
      inplay_date: "2021-11-20",
      inplay_time: "Vormittag",
      status: "active",
      trigger_warning: false,
      created_at: hoursAgo(34),
      // Nigel (tabs) ist hier zuletzt dran gewesen -> es wartet auf Alexander (Vera)
      participant_ids: ["c_nigel", "c_alexander"],
      summary: "Ein anonymer Umschlag zwingt zwei Fremde zu einem heiklen Deal.",
    },
  ];
}

export function seedPosts(): Post[] {
  return [
    {
      id: "post_1",
      scene_id: "s_cafe",
      character_id: "c_elliot",
      content:
        "Das Café roch nach nassem Mantel und Zimt. Elliot schüttelte den Regen von seiner Jacke, bevor er die Tür hinter sich zuzog — zu fest, der Glöckner schepperte schrill — und dann sah er ihn. Julius. An dem kleinen Tisch am Fenster, die Hände um eine Tasse, den Blick nach draußen gerichtet, als wäre er allein auf der Welt.",
      post_number: 1,
      created_at: hoursAgo(20),
    },
    {
      id: "post_2",
      scene_id: "s_cafe",
      character_id: "c_julius",
      content:
        "Das Glöckchen. Julius verstand, warum er diesem Laden nie traute — die Tür ließ keine Stille zu. Er hob die Tasse, um einen Schluck zu nehmen, und tat dabei sein Bestes, den Eingangsbereich nicht anzusehen. *Irgendjemand.* Immer irgendwer. Seine Augen blieben draußen, auf den Tropfen, die sich am Glas entlangtasteten wie Finger auf einer Klaviertastatur.",
      post_number: 2,
      created_at: hoursAgo(14),
    },
    {
      id: "post_3",
      scene_id: "s_cafe",
      character_id: "c_elliot",
      content:
        "Elliot blieb zwei Sekunden zu lang stehen. Genug, dass es auffallen würde, wenn Julius hingesehen hätte. Er sah nicht hin. Das sagte alles. Elliot kaufte sich seinen Kaffee, zahlte bar, bekam zu wenig Wechselgeld — er sagte nichts — und setzte sich an den Tisch daneben. Nicht gegenüber. Daneben. Nah genug, um zufällig zu sein. Weit genug, um es abstreiten zu können.",
      post_number: 3,
      created_at: hoursAgo(6),
    },
    {
      id: "post_4",
      scene_id: "s_cafe",
      character_id: "c_julius",
      content:
        "Das Stuhlbein schabte. Julius schloss kurz die Augen. *Daneben.* Er hatte die ganze Reihe freier Tische gesehen. Die ganze Reihe. Er trank, ohne sich zu bewegen, und wartete darauf, dass Elliot etwas sagen würde — obwohl er wusste, dass er selbst der war, der als Letztes gesprochen hatte, damals, vor drei Wochen. Regentropfen. Klaviertastatur. Er sah nach draußen.",
      post_number: 4,
      created_at: hoursAgo(2),
    },
    {
      id: "post_5",
      scene_id: "s_shades",
      character_id: "c_elliot",
      content:
        "Das Haus seiner Kindheit empfing ihn wie ein Fremder, der seinen Namen kannte. Elliot legte den Mantel ab und lauschte dem Echo der eigenen Schritte über den Marmor.",
      post_number: 1,
      created_at: "2021-11-15T19:05:00Z",
    },
    {
      id: "post_6",
      scene_id: "s_shades",
      character_id: "c_nigel",
      content:
        "Nigel wartete im Arbeitszimmer, das Diktiergerät längst aus. Manche Gespräche wollte man nicht aufgezeichnet wissen. Er hörte die Tür, die Schritte, und wusste: jetzt.",
      post_number: 2,
      created_at: "2021-11-15T19:18:00Z",
    },
    {
      id: "post_7",
      scene_id: "s_river",
      character_id: "c_nigel",
      content:
        "Nigel schob den Umschlag über den resopalbeschichteten Tisch, ohne den Blick zu heben. Kein Absender, keine Briefmarke — nur sein Name, in einer Handschrift, die er zu kennen glaubte und doch nicht zuordnen konnte. Der Kaffee dampfte längst nicht mehr.",
      post_number: 1,
      created_at: hoursAgo(34),
    },
  ];
}

// Kurzbeschreibungen für einige Orte (Rest bleibt vorerst ohne)
const LOCATION_DESCRIPTIONS: Record<string, string> = {
  "Café Marlowe":
    "Ein enges, immer beschlagenes Café mit schlechtem Licht und gutem Kaffee. Der Glöckner an der Tür lässt keine Stille zu.",
  "Ron's Diner":
    "Resopal, Neonröhren und Pancakes rund um die Uhr. Hier treffen sich die, die nicht gesehen werden wollen.",
  "The Record Store":
    "Plattenladen in Rivers Edge, über dem Julius wohnt. Vinyl, Staub und ein Plattenspieler, der nie ausgeht.",
  "Simmons Anwesen":
    "Kalter Marmor, hohe Decken, zu viele Zimmer. Das Elternhaus der Simmons — schön wie ein Mausoleum.",
  "Glass Tower Bar":
    "Bar in der Spitze eines der Glass Tower. Der beste Ausblick der Stadt, die teuersten Drinks.",
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function seedLocations(): Location[] {
  const out: Location[] = [];
  for (const [area, names] of Object.entries(LOCATION_SUGGESTIONS)) {
    for (const name of names) {
      out.push({
        id: `loc_${area}_${slug(name)}`,
        area,
        name,
        description: LOCATION_DESCRIPTIONS[name] ?? null,
        created_at: "2021-10-01T10:00:00Z",
      });
    }
  }
  return out;
}

export function seedQuotes(): SceneQuote[] {
  return [
    {
      id: "q_1",
      scene_id: "s_cafe",
      post_id: "post_2",
      character_id: "c_julius",
      text: "Immer irgendwer. Seine Augen blieben draußen, auf den Tropfen, die sich am Glas entlangtasteten wie Finger auf einer Klaviertastatur.",
      created_at: hoursAgo(13),
    },
    {
      id: "q_2",
      scene_id: "s_cafe",
      post_id: "post_3",
      character_id: "c_elliot",
      text: "Nah genug, um zufällig zu sein. Weit genug, um es abstreiten zu können.",
      created_at: hoursAgo(6),
    },
    {
      id: "q_3",
      scene_id: "s_shades",
      post_id: "post_6",
      character_id: "c_nigel",
      text: "Manche Gespräche wollte man nicht aufgezeichnet wissen.",
      created_at: hoursAgo(40),
    },
  ];
}
