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
        label: "Karte",
        at: hoursAgo(3),
      },
    },
    {
      id: "p_abby",
      username: "Abby",
      email: "abby@example.com",
      avatar_url: "https://picsum.photos/seed/abbyavatar/200/200",
      bio: "Spielt Lou und Nila. Zwischen Tresen und Galerie zu Hause.",
      created_at: "2021-11-20T10:00:00Z",
      last_seen: hoursAgo(0.5),
      current_location: {
        path: "/szenen/s_ember",
        label: "Szene: Last Call bei The Ember",
        at: hoursAgo(0.5),
      },
    },
    {
      id: "p_jule",
      username: "Jule",
      email: "jule@example.com",
      avatar_url: "https://picsum.photos/seed/juleavatar/200/200",
      bio: "Spielt Sam und Cassandra. Nachtschichten und teure Kunst.",
      created_at: "2021-11-24T10:00:00Z",
      last_seen: hoursAgo(2),
      current_location: {
        path: "/charaktere/c_cassandra",
        label: "Charakter: Cassandra Hale",
        at: hoursAgo(2),
      },
    },
    {
      id: "p_kat",
      username: "Kat",
      email: "kat@example.com",
      avatar_url: "https://picsum.photos/seed/katavatar/200/200",
      bio: "Spielt Irina und Liam. Neu dabei.",
      created_at: "2021-11-28T10:00:00Z",
      last_seen: hoursAgo(4),
      current_location: {
        path: "/einwohnerinnen",
        label: "Einwohner*innen",
        at: hoursAgo(4),
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
      relationships: {
        c_julius: {
          label: "kompliziert",
          note: "Drei Wochen Funkstille, dann sitzt er einen Tisch zu nah. Was zwischen ihnen ist, hat keiner von beiden je benannt.",
        },
        c_nigel: {
          label: "unfertige Rechnung",
          note: "Der Journalist gräbt in der Familiengeschichte. Elliot lächelt und wartet ab, wer zuerst zu viel weiß.",
        },
        c_nila: {
          label: "unterschätzt sie",
          note: "Verkauft ihm Bilder, als täte sie ihm einen Gefallen. Elliot sammelt weiter — und merkt sich den Ton.",
        },
        c_cassandra: {
          label: "Respekt & Vorsicht",
          note: "Die Einzige im Raum, die drei Züge vorausdenkt wie er. Elliot mag Gegner mit Niveau.",
        },
      },
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
      relationships: {
        c_elliot: {
          label: "im Visier",
          note: "Golden Boy mit zu vielen Lücken in der Akte. Nigel bleibt dran.",
        },
        c_sam: {
          label: "Quelle, die schweigt",
          note: "Sanitäter mit Prinzipien. Nigel respektiert das — und bearbeitet ihn trotzdem weiter.",
        },
        c_lou: {
          label: "verschlossenes Buch",
          note: "Weiß mehr als die halbe Stadt und gibt nichts heraus. Genau deshalb kommt Nigel wieder.",
        },
      },
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
      relationships: {
        c_elliot: {
          label: "kompliziert",
          note: "Erkennt seinen Schritt unter hundert anderen — und ärgert sich jedes Mal darüber.",
        },
        c_nila: {
          label: "stille Nähe",
          note: "Ihre Bilder sagen, was er in Musik zu fassen versucht. Julius kommt wieder, ohne es zu erklären.",
        },
      },
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
      relationships: {
        c_cassandra: {
          label: "würdige Gegnerin",
          note: "Verhandelt wie er, nur eleganter. Alexander verliert selten — bei Cassandra ist er sich nicht sicher.",
        },
      },
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
      area: "belle_view",
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
      relationships: {
        c_nila: {
          label: "Freundin & Modell",
          note: "Malt sie am Café-Fenster und behauptet, ihre Nase sei interessant. Riley glaubt kein Wort — und sitzt trotzdem still.",
        },
      },
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
    {
      id: "c_lou",
      player_id: "p_abby",
      name: "Lou Bennett",
      faceclaim: null,
      faceclaim_image_url: "https://picsum.photos/seed/loubennett/400/600",
      tagline: "kennt jeden drink und keine namen",
      role: "bartender",
      age: 30,
      area: "rivers_edge",
      bio: "Steht sechs Nächte die Woche hinter dem Tresen von The Ember und hört zu, was die Leute erzählen, wenn das dritte Glas leer ist. Vergisst nichts, wiederholt nie.",
      pinterest_url: null,
      created_at: "2021-11-20T11:00:00Z",
      height: "175cm",
      figure: "drahtig",
      hair: "dunkel, kurz",
      eyes: "grau-grün",
      full_name: "Lou Bennett",
      sexuality: "pan",
      status: "nonbinär · vergeben an die Spätschicht",
      origin: "irgendwo im mittleren Westen",
      job: "Bartender",
      company: "The Ember",
      quote: "Ich schenke aus. Urteile tu ich nicht.",
      personality:
        "Trocken, wachsam, unerschütterlich freundlich auf eine Art, die niemanden näher kommen lässt. Hört mehr, als es sagt, und behält das meiste für sich. Wer Lou etwas anvertraut, bekommt es nie wieder zu hören — von niemandem.",
      relationships: {
        c_sam: {
          label: "Stammgast",
          note: "Kommt nach jeder Nachtschicht auf ein letztes Glas. Lou schenkt ein, bevor Sam bestellt — das sagt eigentlich alles.",
        },
        c_nigel: {
          label: "hält Abstand",
          note: "Der Journalist, der zu viele Fragen stellt. Lou mag ihn — und erzählt ihm trotzdem nichts.",
        },
      },
    },
    {
      id: "c_nila",
      player_id: "p_abby",
      name: "Nila Okafor",
      faceclaim: "Tati Gabrielle",
      faceclaim_image_url: "https://picsum.photos/seed/nilaokafor/400/600",
      tagline: "malt, was die stadt verschweigt",
      role: "malerin & galeristin",
      age: 27,
      area: "washington",
      bio: "Führt die winzige Galerie Halbmond an der Rückseite eines Hinterhofs und malt nachts, was tagsüber niemand sagen will. Ihre Bilder verkaufen sich schlecht und hängen trotzdem in den richtigen Wohnzimmern.",
      pinterest_url: "https://pinterest.com/nilaokafor",
      created_at: "2021-11-21T11:00:00Z",
      height: "168cm",
      figure: "zierlich",
      hair: "schwarze locken",
      eyes: "dunkelbraun",
      full_name: "Nila Adaeze Okafor",
      sexuality: "lesbisch",
      status: "solo, aber nicht einsam",
      origin: "Rivers Edge, Eden",
      job: "Malerin & Galeristin",
      company: "Galerie Halbmond",
      quote: "Ein Bild lügt nie. Nur die, die davorstehen.",
      personality:
        "Beobachtend, direkt, ohne Geduld für Fassaden. Sieht Menschen schneller, als ihnen lieb ist, und sagt es ihnen manchmal auch. Loyal zu wenigen, kompromisslos in der Kunst.",
      relationships: {
        c_elliot: {
          label: "misstraut ihm",
          note: "Kauft ihre Bilder, als wären es Aktien. Nila verkauft — und behält das, was sie wirklich meint, für sich.",
        },
        c_julius: {
          label: "stille Nähe",
          note: "Redet wenig, sieht viel. Der Einzige, der vor ihren Bildern das Richtige geschwiegen hat.",
        },
        c_riley: {
          label: "Freundin & Modell",
          note: "Sitzt keine fünf Minuten still, redet für drei — und ist trotzdem das ehrlichste Gesicht, das Nila je gemalt hat.",
        },
      },
    },
    {
      id: "c_sam",
      player_id: "p_jule",
      name: "Sam Reyes",
      faceclaim: null,
      faceclaim_image_url: "https://picsum.photos/seed/samreyes/400/600",
      tagline: "sieht die stadt, wenn sie blutet",
      role: "rettungssanitäter",
      age: 29,
      area: "westridge",
      bio: "Fährt Nachtschichten für den Rettungsdienst und kennt Eden von seiner ehrlichsten Seite: um drei Uhr morgens, wenn die Sirenen die Wahrheit sagen. In Westridge groß geworden, nie ganz weg.",
      pinterest_url: null,
      created_at: "2021-11-24T11:00:00Z",
      height: "178cm",
      figure: "kompakt, kräftig",
      hair: "dunkelbraun, undercut",
      eyes: "braun",
      full_name: "Samuel \"Sam\" Reyes",
      sexuality: "bi",
      status: "nonbinär · dauermüde",
      origin: "Westridge, Eden",
      job: "Rettungssanitäter",
      company: "Eden General EMS",
      quote: "Ich frag nicht, wie's passiert ist. Ich sorg nur dafür, dass du morgen noch da bist.",
      personality:
        "Ruhig unter Druck, warm im Kern, abgestumpft an der Oberfläche. Rettet Menschen zum Beruf und traut trotzdem keinem so recht. Schwarzer Humor als Panzer, ein weiches Herz als Geheimnis.",
      relationships: {
        c_lou: {
          label: "vertraut blind",
          note: "Der einzige Mensch in Eden, bei dem Sam nicht erklären muss, warum die Schicht schlimm war.",
        },
        c_nigel: {
          label: "vorsichtig",
          note: "Freundlich, spendiert Pancakes — und will trotzdem etwas. Sam gibt nichts preis, aber die Frühstücke sind gut.",
        },
      },
    },
    {
      id: "c_cassandra",
      player_id: "p_jule",
      name: "Cassandra Hale",
      faceclaim: "Eva Green",
      faceclaim_image_url: "https://picsum.photos/seed/cassandrahale/400/600",
      tagline: "verkauft schönheit, besitzt geheimnisse",
      role: "galeristin & erbin",
      age: 38,
      area: "belle_view",
      bio: "Führt Hale Contemporary mit eiserner Eleganz und einem Auge für das, was Menschen zu verbergen suchen. Was an ihren Wänden hängt, ist teuer. Was sie weiß, ist unbezahlbar.",
      pinterest_url: "https://pinterest.com/halecontemporary",
      created_at: "2021-11-25T11:00:00Z",
      height: "174cm",
      figure: "hochgewachsen, elegant",
      hair: "dunkelbraun, hochgesteckt",
      eyes: "grün",
      full_name: "Cassandra Vivienne Hale",
      sexuality: "hetero",
      status: "verwitwet — angeblich",
      origin: "Belle View, Eden",
      job: "Galeristin & Kunsthändlerin",
      company: "Hale Contemporary",
      quote: "Alles hat einen Preis. Manche zahlen ihn nur später.",
      personality:
        "Kühl, kultiviert, immer drei Züge voraus. Sammelt Gefälligkeiten wie andere Kunst und ruft sie mit einem Lächeln ein. Unter dem Firnis: mehr Verlust, als sie zugibt.",
      relationships: {
        c_alexander: {
          label: "alter Bekannter",
          note: "Kennt seine Masche seit Jahren. Vor Gericht mag er gewinnen — in ihrer Galerie spielt Cassandra.",
        },
        c_elliot: {
          label: "gefährlich interessant",
          note: "Zu jung, um so viel zu wissen, zu ehrgeizig, um harmlos zu sein. Cassandra behält ihn im Blick.",
        },
      },
    },
    {
      id: "c_irina",
      player_id: "p_kat",
      name: "Irina Volkov",
      faceclaim: null,
      faceclaim_image_url: "https://picsum.photos/seed/irinavolkov/400/600",
      tagline: null,
      role: "kellnerin",
      age: 24,
      area: "rivers_edge",
      bio: "Bedient tagsüber im Ron's Diner und tanzt abends, wenn niemand zusieht.",
      pinterest_url: null,
      created_at: "2021-11-28T11:00:00Z",
      height: null,
      figure: null,
      hair: null,
      eyes: null,
      full_name: "Irina Volkov",
      sexuality: null,
      status: "solo",
      origin: "Rivers Edge, Eden",
      job: "Kellnerin",
      company: "Ron's Diner",
      quote: "Ich seh mehr, als ich sage.",
      personality:
        "Ruhig, aufmerksam, ein bisschen scheu — bis man sie zum Lachen bringt.",
    },
    {
      id: "c_liam",
      player_id: "p_kat",
      name: "Liam Carter",
      faceclaim: null,
      faceclaim_image_url: "https://picsum.photos/seed/liamcarter/400/600",
      tagline: null,
      role: "fotograf",
      age: 26,
      area: "washington",
      bio: "Läuft mit einer alten Kamera durch Rivers Edge und fotografiert, was sonst keiner beachtet.",
      pinterest_url: null,
      created_at: "2021-11-28T11:05:00Z",
      height: null,
      figure: null,
      hair: null,
      eyes: null,
      full_name: "Liam Carter",
      sexuality: null,
      status: "solo",
      origin: "Rivers Edge, Eden",
      job: "Fotograf",
      company: "Freelance",
      quote: "Das beste Bild ist das, das keiner posieren wollte.",
      personality:
        "Freundlich, neugierig, immer auf der Suche nach dem richtigen Licht.",
    },
    {
      id: "c_reece",
      player_id: "p_tabs",
      name: "Reece Malone",
      faceclaim: null,
      faceclaim_image_url: "https://picsum.photos/seed/reecemalone/400/600",
      tagline: null,
      role: "musiker",
      age: 27,
      area: "belle_view",
      bio: "Spielt Gitarre in halbleeren Bars und wartet auf den Abend, an dem es voll wird.",
      pinterest_url: null,
      created_at: "2021-10-09T10:00:00Z",
      height: null,
      figure: null,
      hair: null,
      eyes: null,
      full_name: "Reece Malone",
      sexuality: null,
      status: "solo",
      origin: "Rivers Edge, Eden",
      job: "Musiker",
      company: "Freelance",
      quote: "Ein leerer Raum hört am besten zu.",
      personality: "Lässig, warm, ein Träumer mit Lampenfieber.",
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
      location_area: "umland",
      location_name: "Highway 95 Diner",
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
    {
      // Lou (Abby) & Sam (Jule) — geforderte Szene Lou ↔ Sam
      id: "s_ember",
      title: "Last Call bei The Ember",
      location_area: "rivers_edge",
      location_name: "The Ember",
      inplay_date: "2021-11-23",
      inplay_time: "Nacht",
      status: "active",
      trigger_warning: false,
      created_at: hoursAgo(20),
      participant_ids: ["c_lou", "c_sam"],
      summary:
        "Nach der Nachtschicht kommt Sam auf ein letztes Glas — und Lou weiß längst, dass es nicht ums Trinken geht.",
    },
    {
      // Sam (Jule) & Nigel (tabs) — geforderte Szene Sam ↔ Nigel
      id: "s_nigelsam",
      title: "Zwischen zwei Schichten",
      location_area: "westridge",
      location_name: "Route 9 Diner",
      inplay_date: "2021-11-21",
      inplay_time: "früher Morgen",
      status: "active",
      trigger_warning: false,
      created_at: hoursAgo(26),
      participant_ids: ["c_nigel", "c_sam"],
      summary:
        "Nigel will wissen, was Sam auf einem Einsatz gesehen hat. Sam will nur Pancakes und seine Ruhe.",
    },
    {
      // Lou (Abby) & Nigel (tabs) — geforderte Szene Lou ↔ Nigel
      id: "s_nigellou",
      title: "Ein Kaffee, keine Namen",
      location_area: "downtown",
      location_name: "Café Verlaine",
      inplay_date: "2021-11-22",
      inplay_time: "Vormittag",
      status: "active",
      trigger_warning: false,
      created_at: hoursAgo(16),
      participant_ids: ["c_nigel", "c_lou"],
      summary:
        "Weg vom Tresen sucht Nigel bei Lou nach einer Quelle — und stößt auf eine Wand aus höflichem Schweigen.",
    },
    {
      // Nila (Abby) mit Elliot (tabs) & Julius (vera)
      id: "s_gallery",
      title: "Vernissage ohne Publikum",
      location_area: "washington",
      location_name: "Dupont Circle",
      inplay_date: "2021-11-19",
      inplay_time: "Abend",
      status: "active",
      trigger_warning: false,
      created_at: hoursAgo(40),
      participant_ids: ["c_nila", "c_elliot", "c_julius"],
      summary:
        "Am Abend vor der Eröffnung tauchen ein Sammler mit zu viel Geld und ein Musiker mit zu vielen Fragen in Nilas Galerie auf.",
    },
    {
      // Nila (Abby) & Riley (liz)
      id: "s_nila2",
      title: "Zwei Milchkaffee, ein Porträt",
      location_area: "belle_view",
      location_name: "Café an der Promenade",
      inplay_date: "2021-11-17",
      inplay_time: "Nachmittag",
      status: "closed",
      trigger_warning: false,
      created_at: hoursAgo(72),
      participant_ids: ["c_nila", "c_riley"],
      summary: "Nila will Riley malen. Riley kann nur eine Sache nicht: still sitzen.",
    },
    {
      // Cassandra (Jule) mit Alexander (vera) & Elliot (tabs)
      id: "s_hale",
      title: "Ein Bild, das niemand kaufen soll",
      location_area: "belle_view",
      location_name: "Hale Contemporary",
      inplay_date: "2021-11-16",
      inplay_time: "Abend",
      status: "active",
      trigger_warning: false,
      created_at: hoursAgo(52),
      participant_ids: ["c_cassandra", "c_alexander", "c_elliot"],
      summary:
        "In Cassandras Galerie geht es offiziell um ein Gemälde. Inoffiziell um alles andere.",
    },
    {
      // Reece (tabs) & Irina (Kat)
      id: "s_reeceirina",
      title: "Zwischen zwei Songs",
      location_area: "downtown",
      location_name: "Theater am Platz",
      inplay_date: "2021-11-26",
      inplay_time: "Abend",
      status: "active",
      trigger_warning: false,
      created_at: hoursAgo(22),
      participant_ids: ["c_reece", "c_irina"],
      summary: "Reece spielt, Irina hört zu — und bleibt länger, als sie wollte.",
    },
    {
      // Liam (Kat) & Nila (Abby)
      id: "s_liamnila",
      title: "Analog gegen Öl",
      location_area: "washington",
      location_name: "Georgetown",
      inplay_date: "2021-11-27",
      inplay_time: "Nachmittag",
      status: "active",
      trigger_warning: false,
      created_at: hoursAgo(18),
      participant_ids: ["c_liam", "c_nila"],
      summary:
        "Ein Fotograf will Nilas Bilder ablichten. Nila hat dazu eine sehr eigene Meinung.",
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
    // --- Szene: Last Call bei The Ember (s_ember) — Lou & Sam ---
    {
      id: "post_14",
      scene_id: "s_ember",
      character_id: "c_lou",
      content:
        "Kurz vor zwei. Lou stellte die letzten Gläser kopfüber ins Regal, wischte den Tresen in langen, ruhigen Zügen und ließ nur das eine Licht über der Kasse brennen. The Ember war leer bis auf das Summen des Kühlschranks und den Regen, der gegen die Scheibe fand. Dann ging die Tür. Lou musste nicht aufsehen, um zu wissen, wer um diese Zeit noch hereinkam — der Gang verriet die Müdigkeit, die man nur nach zwölf Stunden im Rettungswagen hat.<br><br>„Küche ist zu“, sagte Lou, ohne den Lappen aus der Hand zu legen. „Aber der Whiskey nicht.“",
      post_number: 1,
      created_at: hoursAgo(19),
    },
    {
      id: "post_15",
      scene_id: "s_ember",
      character_id: "c_sam",
      content:
        "Sam ließ sich auf den Hocker fallen, als hätten die Beine nur auf die Erlaubnis gewartet. Die Jacke roch nach Desinfektionsmittel und nach etwas, das Sam den ganzen Abend nicht losgeworden war. „Nur eins“, sagte Sam und wusste selbst, dass es gelogen war. „War kein guter Einsatz.“ Ein müdes Schulterzucken, das mehr Geschichte erzählte, als Sam bereit war zu teilen. „Frag nicht.“",
      post_number: 2,
      created_at: hoursAgo(18),
    },
    {
      id: "post_16",
      scene_id: "s_ember",
      character_id: "c_lou",
      content:
        "Lou fragte nicht. Lou griff nach der Flasche im untersten Regal — der guten, der, die nicht auf der Karte stand — und schenkte zwei Finger ein, ohne zu messen. Das Glas landete lautlos vor Sam. „Ich schenke aus. Ich urteile nicht“, sagte Lou und lehnte sich mit dem Rücken ans Regal, die Arme verschränkt. „Und ich hab die ganze Nacht. Reden ist im Preis inbegriffen. Schweigen auch.“",
      post_number: 3,
      created_at: hoursAgo(17),
    },
    // --- Szene: Zwischen zwei Schichten (s_nigelsam) — Nigel & Sam ---
    {
      id: "post_17",
      scene_id: "s_nigelsam",
      character_id: "c_nigel",
      content:
        "Nigel saß schon in der Nische, als Sam hereinkam — zweite Tasse Kaffee, Notizbuch geschlossen, was bei Nigel selten Zufall war. Er hatte die Schicht abgewartet. Drei Tage lang hatte er den Namen im Einsatzprotokoll gesucht, das ihm niemand hätte geben dürfen, und jetzt saß der einzige Zeuge, der zählte, übernächtigt auf der anderen Seite des Resopaltisches. „Setzen Sie sich“, sagte Nigel. „Pancakes gehen auf mich.“",
      post_number: 1,
      created_at: hoursAgo(25),
    },
    {
      id: "post_18",
      scene_id: "s_nigelsam",
      character_id: "c_sam",
      content:
        "Sam kannte diese Sorte Freundlichkeit. Die, die einen Preis hatte. „Sie sind der von der Tribune“, sagte Sam und blieb stehen, eine Sekunde zu lang, bevor die Müdigkeit über die Vorsicht siegte und Sam sich doch setzte. „Was auf einem Einsatz passiert, bleibt auf dem Einsatz. Das ist kein Prinzip. Das ist Gesetz.“ Der Kellner brachte Kaffee, und Sam legte beide Hände darum. „Aber die Pancakes nehm ich.“",
      post_number: 2,
      created_at: hoursAgo(24),
    },
    {
      id: "post_19",
      scene_id: "s_nigelsam",
      character_id: "c_nigel",
      content:
        "„Ich will keinen Namen“, sagte Nigel und schob die Tasse beiseite, um Platz für nichts zu schaffen — eine Geste, die ehrlich wirken sollte und es zur Hälfte war. „Ich will nur wissen, ob das, was ich zu wissen glaube, mich nachts zu Recht wach hält.“ Er sah Sam an, ohne zu blinzeln. „Sie müssen nichts sagen. Nur nicht widersprechen.“",
      post_number: 3,
      created_at: hoursAgo(23),
    },
    // --- Szene: Ein Kaffee, keine Namen (s_nigellou) — Nigel & Lou ---
    {
      id: "post_20",
      scene_id: "s_nigellou",
      character_id: "c_nigel",
      content:
        "Weg vom Tresen wirkte es harmloser, dachte Nigel — ein Café am Vormittag, zwei Fremde, ein Tisch am Fenster. Er hatte Lou dreimal in The Ember gesehen und jedes Mal denselben Satz gehört: <i>frag jemand anderen.</i> Vielleicht lag es am Ort. Vielleicht redeten Menschen anders, wenn kein Tresen zwischen ihnen stand. „Ich zahle für Informationen nicht“, begann er. „Aber ich vergesse, wer sie mir gegeben hat. Das kann mehr wert sein.“",
      post_number: 1,
      created_at: hoursAgo(15),
    },
    {
      id: "post_21",
      scene_id: "s_nigellou",
      character_id: "c_lou",
      content:
        "Lou rührte den Kaffee, den es gar nicht süßen wollte, und sah Nigel an mit dieser ruhigen, unbestechlichen Freundlichkeit, an der schon andere gescheitert waren. „Wissen Sie, was das Schöne an meinem Job ist?“, sagte Lou schließlich. „Die Leute erzählen mir alles, weil sie wissen, dass ich es niemandem erzähle. In dem Moment, in dem ich anfange zu reden, bin ich raus. Kein Tresen, keine Gäste, kein Lou.“ Ein kleines Lächeln, kein bisschen unfreundlich. „Trinken Sie Ihren Kaffee. Der geht auf mich.“",
      post_number: 2,
      created_at: hoursAgo(14),
    },
    // --- Szene: Vernissage ohne Publikum (s_gallery) — Nila, Elliot, Julius ---
    {
      id: "post_22",
      scene_id: "s_gallery",
      character_id: "c_nila",
      content:
        "Nila hängte das letzte Bild eine Handbreit zu tief und wusste es, ließ es aber hängen — manchmal musste ein Bild kämpfen. Die Galerie Halbmond roch nach Terpentin und kaltem Kaffee, draußen wurde es dunkel, und eigentlich war heute niemand eingeladen. Eigentlich. Als die Türglocke ging, seufzte sie, ohne sich umzudrehen. „Wir eröffnen morgen“, sagte sie. „Wer heute schon reinkommt, will entweder kaufen oder was loswerden. Beides interessiert mich gerade wenig.“",
      post_number: 1,
      created_at: hoursAgo(39),
    },
    {
      id: "post_23",
      scene_id: "s_gallery",
      character_id: "c_elliot",
      content:
        "Elliot ließ den Blick über die Wände wandern, als gehörten sie ihm bereits. „Kaufen“, sagte er und blieb vor dem zu tief gehängten Bild stehen — natürlich vor genau diesem. „Ich sammle Dinge, bevor die Stadt merkt, was sie wert sind.“ Er lächelte das Lächeln, das Türen öffnete und Menschen misstrauisch machte. „Nennen Sie mir einen Preis, den ich Ihnen ausreden kann.“",
      post_number: 2,
      created_at: hoursAgo(38),
    },
    {
      id: "post_24",
      scene_id: "s_gallery",
      character_id: "c_julius",
      content:
        "Julius war schon eine Weile da, ohne dass es jemand bemerkt hatte — hinten, wo das Licht nicht hinreichte, die Hände in den Taschen. „Ich kaufe nichts und will nichts loswerden“, sagte er leise und trat einen Schritt ins Licht. „Ich wollte nur sehen, wie das aussieht, was einen nachts nicht schlafen lässt, wenn es an einer Wand hängt.“ Er sah Nila an, nicht das Bild. „Es sieht ehrlicher aus, als ich dachte.“",
      post_number: 3,
      created_at: hoursAgo(37),
    },
    // --- Szene: Zwei Milchkaffee, ein Porträt (s_nila2) — Nila & Riley ---
    {
      id: "post_25",
      scene_id: "s_nila2",
      character_id: "c_nila",
      content:
        "„Sitz. Still. Fünf Minuten“, sagte Nila und wusste im selben Moment, dass sie ebenso gut den Regen bitten könnte, kurz Pause zu machen. Sie hatte Riley ans Fenster gesetzt, wo das Nachmittagslicht am besten fiel, und den Skizzenblock aufgeklappt. „Ich will nicht dein Gesicht. Das kennt jeder. Ich will das, was du machst, wenn du eine Sekunde lang vergisst, dass jemand hinsieht.“",
      post_number: 1,
      created_at: hoursAgo(71),
    },
    {
      id: "post_26",
      scene_id: "s_nila2",
      character_id: "c_riley",
      content:
        "„Fünf Minuten still ist gegen meine Religion“, sagte Riley, saß aber tatsächlich — die Hände im Schoß, das Kinn schief, ein Grinsen, das nicht ganz verschwand. „Weißt du, wie viele Leute ich am Tag sehe? Und du willst ausgerechnet mich an die Wand hängen.“ Eine kurze Pause, für Riley eine halbe Ewigkeit. „…zeichnest du gerade meine Nase? Meine Nase ist eine Katastrophe.“",
      post_number: 2,
      created_at: hoursAgo(70),
    },
    // --- Szene: Ein Bild, das niemand kaufen soll (s_hale) — Cassandra, Alexander, Elliot ---
    {
      id: "post_27",
      scene_id: "s_hale",
      character_id: "c_cassandra",
      content:
        "Cassandra empfing sie im hinteren Raum, dort, wo die teuren Dinge hingen und die Fenster zur Straße hin blind waren. Zwei Herren im Anzug, an einem Dienstagabend, wegen eines Bildes, das offiziell nicht zum Verkauf stand — sie wusste genau, was das bedeutete. „Meine Herren“, sagte sie und reichte jedem ein Glas, das niemand bestellt hatte. „Das Werk, das Sie interessiert, gehört mir aus einem einzigen Grund: Ich hatte nie vor, es herzugeben. Überzeugen Sie mich, dass ich mich irre.“",
      post_number: 1,
      created_at: hoursAgo(51),
    },
    {
      id: "post_28",
      scene_id: "s_hale",
      character_id: "c_alexander",
      content:
        "Alexander nahm das Glas, trank aber nicht. „Ich vertrete einen Mandanten mit Geduld und einem sehr klaren Bild davon, wo dieses Gemälde hängen soll“, sagte er ruhig. „Ich bin nicht hier, um zu feilschen, Mrs. Hale. Ich bin hier, um Ihnen die Version des Abends anzubieten, in der am Ende alle zufrieden nach Hause gehen.“ Ein feines Lächeln. „Die anderen Versionen gefallen Ihnen weniger.“",
      post_number: 2,
      created_at: hoursAgo(50),
    },
    {
      id: "post_29",
      scene_id: "s_hale",
      character_id: "c_elliot",
      content:
        "Elliot stellte sein Glas unberührt ab und trat vor das Bild, als wäre er mit ihm allein. „Mein Anwalt redet gern von Zufriedenheit“, sagte er, ohne sich umzudrehen. „Mich interessiert etwas Schlichteres, Mrs. Hale. Jeder in diesem Raum weiß, warum dieses Bild nicht verkauft werden soll. Die Frage ist nur, wer es zuerst laut ausspricht.“ Er drehte sich um, und das Lächeln war weg. „Ich habe Zeit. Und ich habe schlechte Manieren, wenn es sich lohnt.“",
      post_number: 3,
      created_at: hoursAgo(49),
    },
    // --- Szene: Zwischen zwei Songs (s_reeceirina) — Reece & Irina ---
    {
      id: "post_30",
      scene_id: "s_reeceirina",
      character_id: "c_reece",
      content:
        "Reece stimmte die Gitarre auf dem Hocker in der Ecke, wo das Licht am wenigsten hinreichte. Drei Gäste, vier leere Tische, und Lou hinterm Tresen — das reichte ihm. Er begann zu spielen, leise, mehr für sich als für den Raum, und bemerkte erst beim zweiten Song, dass jemand an der Tür stehen geblieben war und nicht weiterging.",
      post_number: 1,
      created_at: hoursAgo(21),
    },
    {
      id: "post_31",
      scene_id: "s_reeceirina",
      character_id: "c_irina",
      content:
        "Irina hatte eigentlich nur den Regen abwarten wollen. Sie blieb trotzdem, den Mantel noch nass, und lehnte sich an den Türrahmen, weil Weitergehen sich plötzlich falsch anfühlte. „Nicht aufhören meinetwegen“, sagte sie, als Reece kurz aufsah. „Ich hör von hier ganz gut.“",
      post_number: 2,
      created_at: hoursAgo(20),
    },
    // --- Szene: Analog gegen Öl (s_liamnila) — Liam & Nila ---
    {
      id: "post_32",
      scene_id: "s_liamnila",
      character_id: "c_liam",
      content:
        "Liam schob die Tür der Galerie Halbmond auf, die Kamera schon in der Hand. „Ich hab dein Licht von der Straße gesehen“, sagte er zu Nila, ohne Begrüßung. „Und die Bilder. Darf ich? Nur ein paar Aufnahmen, für nichts Bestimmtes.“",
      post_number: 1,
      created_at: hoursAgo(17),
    },
    {
      id: "post_33",
      scene_id: "s_liamnila",
      character_id: "c_nila",
      content:
        "Nila sah erst die Kamera, dann Liam, dann wieder die Kamera. „Meine Bilder wurden schon oft abfotografiert“, sagte sie und wischte sich Farbe an der Schürze ab. „Meistens von Leuten, die dachten, das ersetzt das Hinsehen.“ Eine Pause, ein halbes Lächeln. „Aber gut. Ein paar. Wenn du das Hinsehen nicht vergisst.“",
      post_number: 2,
      created_at: hoursAgo(16),
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
  "The Ember":
    "Eng, dunkel, Kupfer und Rauch. Die Bar in Rivers Edge, in der man alles erzählen kann, weil Lou nichts weitergibt.",
  "Galerie Halbmond":
    "Winzige Galerie an der Rückseite eines Hinterhofs. Terpentin, kaltes Kaffeewasser und Bilder, die woanders nicht hängen dürften.",
  "Hale Contemporary":
    "Cassandras Galerie in Belle View. Vorne makellose Kunst, hinten die Räume, in denen die eigentlichen Geschäfte laufen.",
  "Café an der Promenade":
    "Kleines Café mit Blick aufs Wasser an der Belle-View-Promenade. Nachmittagslicht, Möwen und der beste Milchkaffee der Küste.",
  "Route 9 Diner":
    "Abgewetzter Diner an der Ausfallstraße von Westridge. Fettige Pancakes, ehrlicher Kaffee, keine Fragen.",
  "Highway 95 Diner":
    "Letzter Halt vor der Stadtgrenze am Highway 95. Neon im Nirgendwo — hier trifft man sich, wenn man nicht gesehen werden will.",
  "Café Verlaine":
    "Ruhiges Café am Theaterplatz in Central. Marmor, Zeitungen und genug Betrieb, um ein Gespräch darin verschwinden zu lassen.",
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
    {
      id: "q_4",
      scene_id: "s_ember",
      post_id: "post_16",
      character_id: "c_lou",
      text: "Ich schenke aus. Ich urteile nicht. Reden ist im Preis inbegriffen. Schweigen auch.",
      created_at: hoursAgo(17),
    },
    {
      id: "q_5",
      scene_id: "s_nigelsam",
      post_id: "post_18",
      character_id: "c_sam",
      text: "Was auf einem Einsatz passiert, bleibt auf dem Einsatz. Das ist kein Prinzip. Das ist Gesetz.",
      created_at: hoursAgo(24),
    },
    {
      id: "q_6",
      scene_id: "s_nigellou",
      post_id: "post_21",
      character_id: "c_lou",
      text: "Die Leute erzählen mir alles, weil sie wissen, dass ich es niemandem erzähle.",
      created_at: hoursAgo(14),
    },
    {
      id: "q_7",
      scene_id: "s_gallery",
      post_id: "post_24",
      character_id: "c_julius",
      text: "Ich wollte nur sehen, wie das aussieht, was einen nachts nicht schlafen lässt, wenn es an einer Wand hängt.",
      created_at: hoursAgo(37),
    },
    {
      id: "q_8",
      scene_id: "s_hale",
      post_id: "post_28",
      character_id: "c_alexander",
      text: "Ich bin hier, um Ihnen die Version des Abends anzubieten, in der am Ende alle zufrieden nach Hause gehen.",
      created_at: hoursAgo(50),
    },
    {
      id: "q_9",
      scene_id: "s_reeceirina",
      post_id: "post_31",
      character_id: "c_irina",
      text: "Nicht aufhören meinetwegen. Ich hör von hier ganz gut.",
      created_at: hoursAgo(20),
    },
    {
      id: "q_10",
      scene_id: "s_liamnila",
      post_id: "post_33",
      character_id: "c_nila",
      text: "Meistens von Leuten, die dachten, das ersetzt das Hinsehen.",
      created_at: hoursAgo(16),
    },
  ];
}
