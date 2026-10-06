-- Profile von Reece und Irina aus der Live-DB (Stand 2026-10-06) nach Stage
-- übertragen. Im Supabase SQL-Editor von „eden stage" ausführen (Run).
-- NICHT in der Live-DB. Wiederholbar.
-- Überschrieben werden nur die Inhalte der beiden Charaktere (Grunddaten,
-- Profil, Handy, Bilder-Adressen). Zuordnung zu Spieler*innen, Beziehungen,
-- Szenen und Posts auf Stage bleiben, wie sie sind. Die Bilder liegen weiter
-- im Speicher der Live-Umgebung und werden von dort geladen.

begin;

update characters c set
  name = r.name,
  faceclaim = r.faceclaim,
  faceclaim_image_url = r.faceclaim_image_url,
  banner_url = r.banner_url,
  tagline = r.tagline,
  role = r.role,
  age = r.age,
  area = r.area,
  bio = r.bio,
  pinterest_url = r.pinterest_url,
  height = r.height,
  figure = r.figure,
  hair = r.hair,
  eyes = r.eyes,
  full_name = r.full_name,
  sexuality = r.sexuality,
  status = r.status,
  origin = r.origin,
  job = r.job,
  company = r.company,
  quote = r.quote,
  personality = r.personality,
  is_npc = r.is_npc,
  phone = r.phone,
  npc_tier = r.npc_tier,
  vibes = r.vibes,
  profile = r.profile
from jsonb_populate_recordset(null::characters, $live$[
 {
  "id": "c_reece",
  "name": "Reece Logan Henderson",
  "faceclaim": "Ed Westwick",
  "faceclaim_image_url": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/characters/muufbd9n-jjpa7v1.webp",
  "banner_url": null,
  "tagline": "if i had a heart",
  "role": "Assistant Professor",
  "age": 31,
  "area": "belle_view",
  "bio": "Definitiv kein Sänger.",
  "pinterest_url": "https://de.pinterest.com/corporalnik/give-him-my-love-if-he-asks/aes/",
  "height": "186 cm",
  "figure": "average",
  "hair": "brown",
  "eyes": "brown",
  "full_name": "Reece Logan Henderson",
  "sexuality": "straight",
  "status": "married to his job",
  "origin": "Eden, VA",
  "job": "Musiker",
  "company": "Freelance",
  "quote": "Ein leerer Raum hört am besten zu.",
  "personality": "Lässig, warm, ein Träumer mit Lampenfieber.",
  "is_npc": false,
  "phone": {
   "apps": [
    "bank",
    "mail",
    "essen",
    "news"
   ],
   "avatar": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/phones/muufllgb-dww0zug.webp",
   "contacts": {
    "c_irina": {
     "name": "Irina",
     "photo": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/phones/muvmgomz-cxdqxwb.webp"
    }
   },
   "relevant": [
    "npc_0gon43a",
    "c_cassandra",
    "c_nila"
   ],
   "favorites": [
    "c_irina"
   ],
   "hide_tiers": []
  },
  "npc_tier": null,
  "vibes": [],
  "profile": {
   "likes": [
    "smalltalk",
    "wilde parties",
    "menschenmengen",
    "die bühne"
   ],
   "major": "jajaja",
   "degree": "phd",
   "family": [
    {
     "id": "fam_b2mipll",
     "name": "Logan Jeffrey Henderson",
     "relation": "Vater",
     "generation": -1,
     "character_id": null
    },
    {
     "id": "fam_nk08wy4",
     "name": "Bluebell Henderson",
     "relation": "Mutter",
     "generation": -1,
     "character_id": null
    },
    {
     "id": "fam_gkn8yhe",
     "name": "Jeffrey Henderson",
     "relation": "Großvater",
     "generation": -2,
     "character_id": null
    },
    {
     "id": "fam_l8nlarx",
     "name": "Lady Henderson",
     "relation": "Großmutter",
     "generation": -2,
     "character_id": null
    }
   ],
   "gender": "männlich",
   "hidden": [],
   "outfit": [
    {
     "r": 0,
     "w": 34,
     "x": 72.54169170673077,
     "y": 25.64756257306647,
     "id": "thing_863bcl6",
     "src": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/things/muwjks2q-6vmsxpy.webp"
    },
    {
     "r": 0,
     "w": 44,
     "x": 28.344726562499996,
     "y": 35.48671070608617,
     "id": "thing_yglmc1t",
     "src": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/things/muwjlbsd-tqcati5.webp"
    },
    {
     "r": 0,
     "w": 34,
     "x": 53.81516676682693,
     "y": 60.51664154823444,
     "id": "thing_z8vp54r",
     "src": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/things/muwjmmx3-hvw5nqq.webp"
    }
   ],
   "skills": [
    {
     "name": "casual flirting",
     "value": 100
    },
    {
     "name": "hier steht ein skill",
     "value": 50
    },
    {
     "name": "und noch einer",
     "value": 70
    }
   ],
   "things": [
    {
     "r": 0,
     "w": 47,
     "x": 35.89430588942308,
     "y": 29.94915278110343,
     "id": "thing_sr3z0hh",
     "src": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/things/muvu34lq-5udynpq.webp"
    },
    {
     "r": 17,
     "w": 42,
     "x": 59.463266225961554,
     "y": 44.68361587066239,
     "id": "thing_eiakgj3",
     "src": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/things/muvu2mns-4au7b3j.webp"
    }
   ],
   "sliders": [
    {
     "left": "links",
     "right": "rechts",
     "value": 50
    },
    {
     "left": "rules are there to be followed",
     "right": "rules are there to be broken",
     "value": 100
    }
   ],
   "dislikes": [
    "langeweile",
    "dicke bücher",
    "einsamkeit"
   ],
   "employer": "Byron University",
   "timeline": [
    {
     "text": "hier steht ein eintrag. ja, dieiei ldjaölfb.kf. öalknfkb ken lkfnk ns, , akfjnk .,f m.f-",
     "year": "1990",
     "title": "kjfbk kkfbk faihf"
    }
   ],
   "birthdate": "1990-11-03",
   "is_student": false,
   "is_working": true,
   "looks_note": "Always in a suit, button-down shirt or finest wool. Has never worn jeans in his life. Collects rare watches and wears them proudly. Family ring on his right hand.",
   "university": "Byron University",
   "study_start": "2021-10-05",
   "traits_plus": [
    "warmherzig",
    "freundlich",
    "lässig",
    "cool",
    "entspannt",
    "aufgeschlossen",
    "tolerant"
   ],
   "traits_minus": [
    "keine",
    "absolut keine",
    "welche schwächen",
    "was redest du da",
    "habe ich noch nie gehört"
   ],
   "signature_url": null,
   "occupation_kind": null,
   "employer_location_id": null,
   "university_location_id": null
  }
 },
 {
  "id": "c_irina",
  "name": "Irina Lwowna Kalina",
  "faceclaim": "Amber Heard",
  "faceclaim_image_url": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/characters/mussnxj4-gwalr8u.webp",
  "banner_url": null,
  "tagline": "red light but you still go",
  "role": "Lawyer",
  "age": 31,
  "area": "washington",
  "bio": "Auf den ersten Blick wirkt Irina, als hätte sie ihr Leben fest im Griff und einen Zehnjahresplan inklusive retirement funds griffbereit auf dem Schreibtisch, in der Realität entwischt der Plan aber meistens gerade so ihren Händen. Im Berufsleben klappt es, bewusste Entscheidungen zu treffen – privat übernehmen die Impulsivität und eine schonungslose Ehrlichkeit, die ihr selbst oft genug den Wind aus den Segeln nimmt, das Steuer. Zumindest, bis sie am nächsten Tag ihr Büro wieder betritt. Nach außen hin umgeben von viel (nicht nur scheinbarer) Arroganz, Sturheit, der dummen Angewohnheit, sehr ehrlich zu sein, und einer Allergie gegen jegliche Art von Kritik steckt in ihr ein Mensch, der sich mit genug Alkohol im Blut zu Wannabe die Seele aus dem Leib tanzen kann.",
  "pinterest_url": "https://de.pinterest.com/corporalnik/i-melt-for-you-i-liquidise/",
  "height": "164 cm",
  "figure": null,
  "hair": "Blonde",
  "eyes": "Green",
  "full_name": null,
  "sexuality": "bisexual",
  "status": "depends on who you ask",
  "origin": "New York City, NY",
  "job": "Kellnerin",
  "company": "Ron's Diner",
  "quote": "Perhaps I am somewhere patient, somehow kind, perhaps in the nook of a cousin universe. Here I have two hands and they are vanishing, the hollow of your back to rest my cheek against.",
  "personality": "Ruhig, aufmerksam, ein bisschen scheu — bis man sie zum Lachen bringt.",
  "is_npc": false,
  "phone": {
   "apps": [
    "mail",
    "news",
    "essen",
    "musik",
    "bank",
    "taxi"
   ],
   "wear": 0,
   "color": "rose",
   "model": "island",
   "avatar": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/phones/muuuu0v2-26bkltd.webp",
   "captic": {
    "bio": "she/her.\nthis is what it is to be happy.\n30. professional all-nighter-puller @ byron university.",
    "handle": "irikalina",
    "enabled": true
   },
   "contacts": {
    "c_liam": {
     "name": "???"
    },
    "c_reece": {
     "name": "R",
     "photo": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/phones/muwbh0qw-66kbi9l.webp"
    },
    "c_elliot": {
     "name": "Elliot spark"
    },
    "npc_0gon43a": {
     "name": "Aleks 🧌"
    }
   },
   "relevant": [
    "c_lou"
   ],
   "favorites": [
    "c_reece",
    "npc_0gon43a"
   ],
   "wallpaper": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/phones/muuefaqr-9bgv5v3.webp",
   "custom_apps": [
    {
     "id": "app_6gx7f6h",
     "icon": "https://orpotzcxprcohqunlkgh.supabase.co/storage/v1/object/public/images/phones/muwbmq4g-xr9h3bp.webp",
     "name": "Classpass"
    }
   ]
  },
  "npc_tier": null,
  "vibes": [],
  "profile": {
   "likes": [],
   "major": null,
   "degree": null,
   "family": [
    {
     "id": "fam_5la1kij",
     "name": "Wiktoriya Kalina-Abrams",
     "relation": "Mutter",
     "generation": -1,
     "character_id": null
    },
    {
     "id": "fam_l8fuqw5",
     "name": "Robert Abrams",
     "relation": "Stiefvater",
     "generation": -1,
     "character_id": null
    },
    {
     "id": "fam_q1zmc41",
     "name": "Aleksander Kalina-Smith",
     "relation": "Bruder",
     "generation": 0,
     "character_id": "npc_0gon43a"
    },
    {
     "id": "fam_sps24ro",
     "name": "Diana Kalina-Smith",
     "side": false,
     "relation": "Schwägerin",
     "generation": 0,
     "character_id": null
    }
   ],
   "gender": "weiblich",
   "hidden": [],
   "outfit": [],
   "skills": [
    {
     "name": "kein weinsnob sein (betrunken)",
     "value": 100
    },
    {
     "name": "kein weinsnob sein (nüchtern)",
     "value": 40
    },
    {
     "name": "casual flirting",
     "value": 80
    },
    {
     "name": "non-casual flirting",
     "value": 15
    },
    {
     "name": "tinder matches ghosten",
     "value": 85
    },
    {
     "name": "texting back",
     "value": 40
    },
    {
     "name": "keeping plants alive",
     "value": 0
    }
   ],
   "things": [],
   "sliders": [
    {
     "left": "rules are there to be followed",
     "right": "falls in love with PhD-advisor",
     "value": 60
    },
    {
     "left": "stop your addiction to being right",
     "right": "good advice for everyone who isn't me",
     "value": 100
    },
    {
     "left": "sex playlist on spotify",
     "right": "romantic mixtape",
     "value": 15
    },
    {
     "left": "obscure documentary about Massachusett's railway system in 1840",
     "right": "Love Island",
     "value": 85
    }
   ],
   "dislikes": [],
   "employer": null,
   "timeline": [
    {
     "text": "Irina wurde am 08. Mai 1991 in New York City geboren.",
     "year": "1991",
     "title": "Birth"
    },
    {
     "text": "Irinas Vater stirbt an einem Herzinfarkt.",
     "year": "1993",
     "title": "Bye Lew"
    },
    {
     "text": "Fünf Jahre nach dem Tod ihres Mannes heiratet Irinas Mutter Robert Abrams, der für Irina zu einer Vaterfigur wird. Ihr Bruder Aleksander mag ihn zunächst nicht, was im Teenageralter zu Streitigkeiten zwischen ihm und Irina führt, sich später jedoch bessert.",
     "year": "1998",
     "title": "Mom's wedding"
    },
    {
     "text": "Während der High School war Irina hauptsächlich gestresst. Da sie schon als Junior den Wunsch hatte, Anwältin zu werden – und das in einer guten Kanzlei in New York –, war sie lange an ihren Noten stärker interessiert als an ihren Mitmenschen.",
     "year": "2009",
     "title": "High School Diploma"
    },
    {
     "text": "Im College besserte sich das: Zwar wurde es an der NYU nicht weniger anstrengend, als in der High School (im Gegenteil), aber Irina kam besser damit klar, sich gezielt Zeit für Freund*innen zu nehmen. Nach insgesamt vier Jahren hielt sie ihr Undergraduate Degree mit major in Economics und minor in Law and Society in der Hand.",
     "year": "2013",
     "title": "Undergraduate Degree in Economics and Law & Society"
    },
    {
     "text": "Drei Jahre später folgte am 26. Mai 2016 der Juris Doctor in Harvard, währenddessen sie im Rahmen des Programms in einer Bostoner NGO gearbeitet hat. Nach der Teilnahme am Bar Exam ging sie für einen zweimonatigen Trip nach Europa, um schließlich Anfang November in einer New Yorker Kanzlei ihren Job anzutreten.",
     "year": "2016",
     "title": "J.D., Bar Exam, Europe, Work"
    },
    {
     "text": "Der eigentliche Plan war, sich in ihrer New Yorker Kanzlei langsam hochzuarbeiten. Das klappte genau so lange gut, bis Irina zufällig auf das PhD-Programm der Byron University stieß – und den Posten auch angeboten bekam. Zwei harte Jahre voller Prüfungen und Vorbereitungen wurden abgelöst von drei härteren Jahren, in denen sie insgesamt drei Paper abgeben und präsentieren muss, die ihre Dissertation bilden. Zwei von drei sind durch – das letzte hoffentlich auch bald.",
     "year": "2017",
     "title": "Starts PHD in Economics & Law"
    }
   ],
   "birthdate": "1990-05-08",
   "is_student": false,
   "is_working": true,
   "looks_note": "Exudes the confidence she wanted to have in middle school. Sparse freckles on her nose. Usually in skinny jeans and a blouse. Always wearing the anklet her parents gave her + her grandma's ring on her left pinky. Won't leave the house without mascara and blush. Almost always wearing lipstick.",
   "university": null,
   "study_start": null,
   "traits_plus": [],
   "traits_minus": [],
   "signature_url": null,
   "occupation_kind": null,
   "employer_location_id": null
  }
 }
]$live$::jsonb) r
where c.id = r.id;

commit;

-- Kontrolle: sollte zwei Zeilen zeigen
select id, name, role from characters where id in ('c_reece', 'c_irina');
