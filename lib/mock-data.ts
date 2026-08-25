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
    {
      id: "p_liz",
      username: "liz",
      email: "liz@example.com",
      avatar_url: "https://picsum.photos/seed/lizavatar/200/200",
      bio: "Spielt Riley und Roach. Neu in Eden.",
      created_at: "2021-11-10T10:00:00Z",
      last_seen: hoursAgo(3),
      current_location: {
        path: "/orte",
        label: "Orte",
        at: hoursAgo(3),
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
      quote: "The ends justify the means.",
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
      quote: "Follow the money.",
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
      quote: "Ein guter Beat verzeiht jede Lüge.",
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
      quote: "Everyone deserves a defense. Mine costs more.",
      personality:
        "Kontrolliert, eloquent, eiskalt unter Druck. Behandelt das Leben wie einen Prozess, den er zu gewinnen gedenkt — koste es, wen es wolle.",
    },
    {
      id: "c_riley",
      player_id: "p_liz",
      name: "Riley Brooks",
      faceclaim: null,
      faceclaim_image_url: "https://picsum.photos/seed/rileybrooks/400/600",
      tagline: "runs on caffeine and bad ideas",
      role: "barista",
      age: 22,
      area: "rivers_edge",
      bio: "Steht tagsüber hinter der Theke, nachts hinter der Kamera. Kennt jeden in Rivers Edge und die halbe Stadt beim Vornamen.",
      pinterest_url: null,
      created_at: "2021-11-11T10:00:00Z",
      height: "170cm",
      figure: "zierlich",
      hair: "kupferrot",
      eyes: "haselnuss",
      full_name: "Riley Brooks",
      sexuality: "pan",
      status: "chronisch verknallt",
      origin: "Rivers Edge, Eden",
      job: "Barista",
      company: "Café Marlowe",
      quote: "Ich merk mir Gesichter. Und Trinkgeld.",
      personality:
        "Warmherzig, vorlaut, unheilbar neugierig. Redet zu viel, hört aber genau zu — und vergisst nie, wer sich wie benommen hat.",
    },
    {
      id: "c_roach",
      player_id: "p_liz",
      name: "Roach",
      faceclaim: null,
      faceclaim_image_url: "https://picsum.photos/seed/roachdelgado/400/600",
      tagline: null,
      role: "mechaniker",
      age: 31,
      area: "westridge",
      bio: "Schraubt an allem, was Motor hat, und an ein paar Dingen, die keinen haben sollten. In Westridge geboren, in Westridge geblieben.",
      pinterest_url: null,
      created_at: "2021-11-12T10:00:00Z",
      height: "182cm",
      figure: "breit",
      hair: "rasiert",
      eyes: "dunkelbraun",
      full_name: "Marcus \"Roach\" Delgado",
      sexuality: "hetero",
      status: "besser nicht fragen",
      origin: "Westridge, Eden",
      job: "Kfz-Mechaniker",
      company: "Delgado Auto & Salvage",
      quote: "Alles lässt sich reparieren. Fast alles.",
      personality:
        "Wortkarg, loyal, gefährlich ruhig. Tut niemandem etwas, solange man ihn in Ruhe lässt — und ein sehr langes Gedächtnis für die, die es nicht tun.",
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
    {
      // Mockup-Szene für Riley (liz) — mit Elliot (tabs) und Julius (vera)
      id: "s_riley",
      title: "Vinyl und andere Fehler",
      location_area: "rivers_edge",
      location_name: "The Record Store",
      inplay_date: "2021-11-18",
      inplay_time: "Abend",
      status: "active",
      trigger_warning: false,
      created_at: hoursAgo(48),
      participant_ids: ["c_riley", "c_julius", "c_elliot"],
      summary: "Riley schließt den Laden ab — und zwei ungebetene Gäste machen daraus eine lange Nacht.",
    },
    {
      // Mockup-Szene für Roach (liz) — mit Nigel (tabs) und Alexander (vera)
      id: "s_roach",
      title: "Kein guter Ort für Fragen",
      location_area: "westridge",
      location_name: "Trailer Park",
      inplay_date: "2021-11-19",
      inplay_time: "Nacht",
      status: "active",
      trigger_warning: false,
      created_at: hoursAgo(30),
      participant_ids: ["c_roach", "c_nigel", "c_alexander"],
      summary: "Ein Journalist und ein Anwalt tauchen in Westridge auf — und Roach mag keinen von beiden.",
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
        "Das Café roch nach nassem Mantel und Zimt. Elliot schüttelte den Regen von seiner Jacke, bevor er die Tür hinter sich zuzog — zu fest, der Glöckner schepperte schrill — und dann sah er ihn. Julius. An dem kleinen Tisch am Fenster, die Hände um eine Tasse, den Blick nach draußen gerichtet, als wäre er allein auf der Welt.<br><br>Drei Wochen. Genau drei Wochen war es her, dass sie zuletzt im selben Raum gestanden hatten, und Elliot hatte in jeder einzelnen Nacht davon eine Variante durchgespielt: was er sagen würde, was er <i>nicht</i> sagen würde, in welchem Winkel er den Kopf halten müsste, damit es nach Gleichgültigkeit aussah. Keine dieser Varianten hatte den Regen einkalkuliert, der ihm jetzt vom Kragen in den Nacken lief, oder die Art, wie sein Puls gegen die Rippen schlug, als hätte er etwas zu verbergen — was er hatte, natürlich, das hatte er immer.<br><br>Er trat an die Theke. Bestellte. Hörte die eigene Stimme zu fest klingen, zu kontrolliert, und hasste sie dafür. Hinter ihm, am Fenster, rührte sich nichts. <b>Gut.</b> Soll er ruhig glauben, ich hätte ihn nicht bemerkt.",
      post_number: 1,
      created_at: hoursAgo(20),
    },
    {
      id: "post_2",
      scene_id: "s_cafe",
      character_id: "c_julius",
      content:
        "Das Glöckchen. Julius verstand, warum er diesem Laden nie traute — die Tür ließ keine Stille zu. Er hob die Tasse, um einen Schluck zu nehmen, und tat dabei sein Bestes, den Eingangsbereich nicht anzusehen. *Irgendjemand.* Immer irgendwer. Seine Augen blieben draußen, auf den Tropfen, die sich am Glas entlangtasteten wie Finger auf einer Klaviertastatur.<br><br>Er kannte den Schritt. Das war das Lächerliche daran — er kannte ihn aus tausend Fluren, aus Treppenhäusern, aus dem Nachhall einer Tür, die zu fest ins Schloss fiel. Er hätte ihn unter hundert anderen herausgehört, mit verbundenen Augen, in einem vollen Raum. Und genau das machte ihn so wütend: dass sein Körper Elliot erkannte, bevor sein Verstand entscheiden konnte, ob er das überhaupt wollte.<br><br>Die Tasse war längst leer. Er hielt sie trotzdem fest, beide Hände darum gelegt, als gäbe es da noch Wärme abzuholen. Draußen wurde der Regen dichter. <i>Bleib sitzen</i>, dachte er. <i>Sieh nicht hin. Du hast das letzte Mal gesprochen. Diesmal ist er dran.</i>",
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
    // --- Mockup-Szene: Riley (s_riley) ---
    {
      id: "post_8",
      scene_id: "s_riley",
      character_id: "c_riley",
      content:
        "Riley drehte das Schild an der Tür auf <i>geschlossen</i> und ließ die letzte Platte auslaufen, bevor sie den Arm des Plattenspielers anhob. „Wir haben zu“, sagte sie, ohne sich umzudrehen — und wusste schon, dass die zwei am Regal nicht deshalb gehen würden.",
      post_number: 1,
      created_at: hoursAgo(46),
    },
    {
      id: "post_9",
      scene_id: "s_riley",
      character_id: "c_julius",
      content:
        "Julius kam die Treppe von oben herunter, den Schlüssel noch in der Hand. „Sie gehört quasi zum Inventar“, sagte er zu Riley und nickte in Elliots Richtung, ohne ihn anzusehen. „Der hier leider auch.“",
      post_number: 2,
      created_at: hoursAgo(45),
    },
    {
      id: "post_10",
      scene_id: "s_riley",
      character_id: "c_elliot",
      content:
        "Elliot lächelte das Lächeln, das nie ganz die Augen erreichte. „Ich kauf nur eine Platte“, sagte er und zog eine aus dem Regal, ohne hinzusehen. „Und höre mir an, worüber ihr beiden so redet, wenn abgeschlossen ist.“",
      post_number: 3,
      created_at: hoursAgo(44),
    },
    // --- Mockup-Szene: Roach (s_roach) ---
    {
      id: "post_11",
      scene_id: "s_roach",
      character_id: "c_roach",
      content:
        "Roach wischte sich das Öl an einem Lappen ab, der es nicht besser machte, und musterte die beiden Anzüge, die zwischen den Wohnwagen fehl am Platz wirkten wie Klavierlack im Schlamm. „Ihr seid falsch abgebogen“, sagte er. Es war keine Frage.",
      post_number: 1,
      created_at: hoursAgo(28),
    },
    {
      id: "post_12",
      scene_id: "s_roach",
      character_id: "c_nigel",
      content:
        "„Vielleicht“, sagte Nigel und blieb stehen, wo er war. „Oder Sie kennen einen Wagen, der letzte Woche hier durch ist. Kennzeichen halb abgeschraubt.“ Er ließ die Worte im Regen hängen. „Ich frage nur, bevor es jemand Unfreundlicheres tut.“",
      post_number: 2,
      created_at: hoursAgo(27),
    },
    {
      id: "post_13",
      scene_id: "s_roach",
      character_id: "c_alexander",
      content:
        "Alexander blieb einen Schritt zurück, die Hände in den Manteltaschen, und ließ Nigel reden. Erst als Roach nicht antwortete, sagte er ruhig: „Was mein Kollege meint: Es gibt einen Weg, bei dem niemand Ihren Namen aufschreibt. Ich empfehle ihn.“",
      post_number: 3,
      created_at: hoursAgo(26),
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
