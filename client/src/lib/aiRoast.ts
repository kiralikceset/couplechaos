import { getLocale } from './i18n';

// AI Roast System - Generates funny, savage but not hurtful comments
// These are pre-written roasts that feel AI-generated but work offline

interface RoastTemplate {
  tr: string[];
  en: string[];
  de: string[];
  es: string[];
}

// Score-based roasts (0-100 scale)
const roastsByScore: Record<string, RoastTemplate> = {
  terrible: { // 0-20
    tr: [
      "Jüri olarak istifa ediyorum. Bu çizim beni sanattan soğuttu 🎭",
      "Bu bir çizim değil, mahkemede delil olarak kullanılacak bir olay 🧑‍⚖️",
      "Bunu gören müze kendi kendini yaktı 🔥",
      "Tuval avukat istedi, haklı da 📜",
      "Bu... bu ne? Buzdolabına asılacak seviye değil bu 😭",
      "Picasso bile mezarında döndü şu an 💀",
      "3 yaşındaki yeğenim daha iyi çizer, üzgünüm 🫣",
      "Bu çizim suç mahalli kanıtı gibi görünüyor 🔍",
      "Gözlerimi yıkamam lazım bunu gördükten sonra 👁️",
      "Partnerin bunu görünce ayrılık düşünür 😂",
      "Bu sanat değil, bu bir çığlık 🫠",
      "Telefonun sana ne yaptı ki böyle cezalandırıyorsun? 📱",
      "AI olarak bile bunu tanıyamadım... tebrikler? 🤖",
      "Çizim yeteneklerin... ilginç bir yerde 📉"
    ],
    en: [
      "As a judge, I resign. This drawing ended my love for art 🎭",
      "This isn't a drawing, it's evidence for a court case 🧑‍⚖️",
      "A museum saw this and set itself on fire 🔥",
      "The canvas asked for a lawyer, and honestly, fair 📜",
      "What... what is this? This isn't fridge-worthy 😭",
      "Even Picasso is rolling in his grave right now 💀",
      "My 3-year-old nephew draws better, sorry 🫣",
      "This looks like crime scene evidence 🔍",
      "I need to wash my eyes after seeing this 👁️",
      "Your partner might reconsider the relationship 😂",
      "This isn't art, this is a cry for help 🫠",
      "What did your phone do to deserve this? 📱",
      "Even as an AI, I couldn't recognize this... congrats? 🤖",
      "Your drawing skills are... in an interesting place 📉"
    ],
    de: [
      "Als Juror trete ich zurück. Diese Zeichnung hat mir die Kunst verleidet 🎭",
      "Das ist keine Zeichnung, das ist ein Beweisstück vor Gericht 🧑‍⚖️",
      "Die Leinwand hat einen Anwalt verlangt. Verständlich 📜",
      "Was... was ist das? Das gehört nicht an den Kühlschrank 😭",
      "Selbst Picasso dreht sich gerade im Grab um 💀",
      "Mein 3-jähriger Neffe zeichnet besser, sorry 🫣",
      "Das sieht aus wie ein Beweisstück vom Tatort 🔍",
      "Ich muss mir die Augen waschen nach dem hier 👁️",
      "Dein Partner überlegt sich gerade die Beziehung 😂",
      "Das ist keine Kunst, das ist ein Hilferuf 🫠",
      "Was hat dein Handy dir getan? 📱",
      "Selbst als KI konnte ich das nicht erkennen... Glückwunsch? 🤖",
      "Deine Zeichenkünste sind... an einem interessanten Ort 📉"
    ],
    es: [
      "Como juez, dimito. Este dibujo acabó con mi amor por el arte 🎭",
      "Esto no es un dibujo, es una prueba en un juicio 🧑‍⚖️",
      "El lienzo pidió un abogado, y con razón 📜",
      "¿Qué... qué es esto? Esto no merece estar en la nevera 😭",
      "Hasta Picasso se está revolcando en su tumba 💀",
      "Mi sobrino de 3 años dibuja mejor, lo siento 🫣",
      "Esto parece evidencia de una escena del crimen 🔍",
      "Necesito lavarme los ojos después de ver esto 👁️",
      "Tu pareja podría reconsiderar la relación 😂",
      "Esto no es arte, es un grito de auxilio 🫠",
      "¿Qué te hizo tu teléfono para merecer esto? 📱",
      "Ni como IA pude reconocer esto... ¿felicidades? 🤖",
      "Tus habilidades de dibujo están... en un lugar interesante 📉"
    ]
  },
  bad: { // 21-40
    tr: [
      "Bu çizimi gören bir patates bile kendini daha yakışıklı buldu 🥔",
      "İpucu veren de çizen de bu turdan sonra terapiye gitmeli 🛋️",
      "Sanki karanlıkta, eldivenle, deprem sırasında çizilmiş 🧤",
      "Bunu duvara assan ev değeri düşer 🏚️",
      "Hmm... eğer gözlerimi kısarsam ve kafamı eğersem... hala anlamıyorum 🤔",
      "E for effort diyelim, tamam mı? 😅",
      "Soyut sanat mı yapıyorsun yoksa gerçekten mi denedin? 🎨",
      "Partnerin çok sabırlı bir insan olmalı 🙏",
      "Bu çizim 'cesaret ödülü' hak ediyor 🏆",
      "Niyetin iyiydi ama eller takip etmedi 🫡",
      "Bence kalem tutma şeklini değiştirmelisin 📝",
      "Yaratıcı... ama doğru anlamda değil 💫",
      "En azından denedin, bu bir şey 👏",
      "Bu çizimi NFT olarak satarsan belki 1 lira eder 💰"
    ],
    en: [
      "Even a potato saw this and felt prettier 🥔",
      "Both the hint giver and the drawer need therapy after this round 🛋️",
      "Drawn in the dark, with oven mitts, during an earthquake 🧤",
      "Hang this on a wall and the house loses value 🏚️",
      "Hmm... if I squint and tilt my head... still no idea 🤔",
      "Let's just say E for effort, okay? 😅",
      "Are you doing abstract art or actually trying? 🎨",
      "Your partner must be very patient 🙏",
      "This drawing deserves a 'courage award' 🏆",
      "Good intentions, hands didn't follow 🫡",
      "Maybe try holding the pen differently 📝",
      "Creative... but not in the right way 💫",
      "At least you tried, that's something 👏",
      "If you sell this as an NFT, maybe $1 💰"
    ],
    de: [
      "Sogar eine Kartoffel fühlte sich danach hübscher 🥔",
      "Im Dunkeln gezeichnet, mit Ofenhandschuhen, bei einem Erdbeben 🧤",
      "Häng das auf und der Hauswert sinkt 🏚️",
      "Hmm... wenn ich die Augen zusammenkneife... immer noch keine Ahnung 🤔",
      "Sagen wir einfach E für Einsatz, okay? 😅",
      "Machst du abstrakte Kunst oder versuchst du es wirklich? 🎨",
      "Dein Partner muss sehr geduldig sein 🙏",
      "Diese Zeichnung verdient einen 'Mut-Preis' 🏆",
      "Gute Absichten, die Hände haben nicht mitgespielt 🫡",
      "Vielleicht den Stift anders halten? 📝",
      "Kreativ... aber nicht auf die richtige Art 💫",
      "Zumindest hast du es versucht 👏",
      "Als NFT vielleicht 1€ wert 💰"
    ],
    es: [
      "Hasta una patata se sintió más guapa al ver esto 🥔",
      "Dibujado a oscuras, con guantes de cocina, durante un terremoto 🧤",
      "Cuelga esto en la pared y la casa pierde valor 🏚️",
      "Hmm... si entrecierro los ojos... sigo sin entender 🤔",
      "Digamos que E de esfuerzo, ¿vale? 😅",
      "¿Estás haciendo arte abstracto o de verdad intentas? 🎨",
      "Tu pareja debe ser muy paciente 🙏",
      "Este dibujo merece un 'premio al coraje' 🏆",
      "Buenas intenciones, las manos no siguieron 🫡",
      "Quizás intenta sostener el lápiz diferente 📝",
      "Creativo... pero no de la manera correcta 💫",
      "Al menos lo intentaste, eso cuenta 👏",
      "Si vendes esto como NFT, quizás $1 💰"
    ]
  },
  okay: { // 41-60
    tr: [
      "Ne iyi ne kötü. Pazartesi sabahı gibi bir çizim 🫤",
      "Belli belirsiz tanıdık. Rüyada görülen kuzen gibi 💭",
      "Jüri kararsız. Biri ağladı, biri güldü, biri uyudu 😴",
      "Fena değil! Ama harika da değil 😏",
      "Ortalama bir çizim — tıpkı ilişkiniz gibi 💀 (şaka şaka)",
      "Bunu tanıyabiliyorum! İlerleme var 📈",
      "Partnerin %60 anlamış olabilir... belki 🤷",
      "Sanat okuluna başvurma ama hobi olarak devam et 🎨",
      "Eh işte, olmuş gibi olmuş 🫤",
      "Ne harika ne berbat — tam ortası 📊",
      "Bunu buzdolabına asabilirsin... arka tarafa 😂",
      "Gelişme var! Geçen seferden daha iyi 📈",
      "Orta düzey kaos — kabul edilebilir 🌪️"
    ],
    en: [
      "Not good, not bad. A Monday-morning kind of drawing 🫤",
      "Vaguely familiar, like a cousin you saw in a dream 💭",
      "The jury is split: one cried, one laughed, one fell asleep 😴",
      "Not bad! But not great either 😏",
      "Average drawing — just like your relationship 💀 (jk jk)",
      "I can recognize this! Progress! 📈",
      "Your partner might've understood 60%... maybe 🤷",
      "Don't apply to art school but keep it as a hobby 🎨",
      "It's... something 🫤",
      "Neither amazing nor terrible — right in the middle 📊",
      "You can put this on the fridge... in the back 😂",
      "Improvement! Better than last time 📈",
      "Medium chaos — acceptable 🌪️"
    ],
    de: [
      "Nicht gut, nicht schlecht. Eine Montagmorgen-Zeichnung 🫤",
      "Die Jury ist gespalten: einer weinte, einer lachte, einer schlief 😴",
      "Nicht schlecht! Aber auch nicht toll 😏",
      "Durchschnittliche Zeichnung — wie eure Beziehung 💀 (Spaß)",
      "Ich kann das erkennen! Fortschritt! 📈",
      "Dein Partner hat vielleicht 60% verstanden... vielleicht 🤷",
      "Bewirb dich nicht an der Kunstschule, aber mach weiter 🎨",
      "Es ist... etwas 🫤",
      "Weder toll noch schrecklich — genau in der Mitte 📊",
      "Das kann an den Kühlschrank... hinten 😂",
      "Verbesserung! Besser als letztes Mal 📈",
      "Mittleres Chaos — akzeptabel 🌪️"
    ],
    es: [
      "Ni bien ni mal. Un dibujo de lunes por la mañana 🫤",
      "El jurado está dividido: uno lloró, uno rió, uno se durmió 😴",
      "¡No está mal! Pero tampoco genial 😏",
      "Dibujo promedio — como su relación 💀 (es broma)",
      "¡Puedo reconocer esto! ¡Progreso! 📈",
      "Tu pareja quizás entendió el 60%... quizás 🤷",
      "No apliques a escuela de arte pero sigue como hobby 🎨",
      "Es... algo 🫤",
      "Ni increíble ni terrible — justo en el medio 📊",
      "Puedes poner esto en la nevera... atrás 😂",
      "¡Mejora! Mejor que la última vez 📈",
      "Caos medio — aceptable 🌪️"
    ]
  },
  good: { // 61-80
    tr: [
      "Kabul ediyorum, iyi. Ama bunu söylemek bana fiziksel acı veriyor 😤",
      "Sergide asılır. Tuvaletin yanındaki duvarda ama olsun 🖼️",
      "Fena değil. Annen buzdolabına asardı, ben asmam 🧲",
      "Ooo bu iyi! Partnerin şanslı 👀",
      "Bak bak bak, yetenek var burada! 🌟",
      "Bu çizim gerçekten güzel — şaşırdım açıkçası 😮",
      "Sanat geni var sende, saklama! 🎨",
      "Partnerin bunu hemen anlamıştır 💡",
      "İmpress edildim! Devam et böyle 🔥",
      "Bu buzdolabının ön yüzüne layık! ⭐",
      "Vay be, gerçekten çaba görmüşsün 👏",
      "Güzel iş! Ama hala mükemmel değil 😏",
      "Partnerin gurur duyuyor olmalı 💕"
    ],
    en: [
      "Fine, it's good. Saying that physically hurts me 😤",
      "It would hang in a gallery. Next to the restroom, but still 🖼️",
      "Not bad. Your mom would put it on the fridge. I wouldn't 🧲",
      "Ooo this is good! Your partner is lucky 👀",
      "Look at that, there's talent here! 🌟",
      "This drawing is actually nice — I'm surprised 😮",
      "You've got an art gene, don't hide it! 🎨",
      "Your partner definitely got this one 💡",
      "I'm impressed! Keep it up 🔥",
      "This deserves the front of the fridge! ⭐",
      "Wow, real effort here 👏",
      "Nice work! But still not perfect 😏",
      "Your partner must be proud 💕"
    ],
    de: [
      "Na gut, es ist gut. Das zu sagen tut mir körperlich weh 😤",
      "Würde in einer Galerie hängen. Neben der Toilette, aber immerhin 🖼️",
      "Ooo das ist gut! Dein Partner hat Glück 👀",
      "Schau mal, da ist Talent! 🌟",
      "Diese Zeichnung ist echt schön — ich bin überrascht 😮",
      "Du hast ein Kunst-Gen, versteck es nicht! 🎨",
      "Dein Partner hat das sofort erkannt 💡",
      "Ich bin beeindruckt! Weiter so 🔥",
      "Das verdient die Vorderseite des Kühlschranks! ⭐",
      "Wow, echte Mühe hier 👏",
      "Gute Arbeit! Aber noch nicht perfekt 😏",
      "Dein Partner muss stolz sein 💕"
    ],
    es: [
      "Vale, está bien. Decirlo me duele físicamente 😤",
      "Colgaría en una galería. Junto al baño, pero cuenta 🖼️",
      "¡Ooo esto está bien! Tu pareja tiene suerte 👀",
      "¡Mira, hay talento aquí! 🌟",
      "Este dibujo es bonito — estoy sorprendido 😮",
      "¡Tienes un gen artístico, no lo escondas! 🎨",
      "Tu pareja seguro lo entendió 💡",
      "¡Estoy impresionado! Sigue así 🔥",
      "¡Esto merece el frente de la nevera! ⭐",
      "Wow, esfuerzo real aquí 👏",
      "¡Buen trabajo! Pero aún no perfecto 😏",
      "Tu pareja debe estar orgullosa 💕"
    ]
  },
  amazing: { // 81-100
    tr: [
      "Bu kadar iyi çizmek şüpheli. Hile mi yaptınız, yoksa sevgi mi bu? 🕵️",
      "Jüri ayakta. Biri bayıldı, ambulans yolda 🚑",
      "Bu çizimden sonra emekli oluyorum, buradan dönüş yok 🏆",
      "SANATÇI! Bu ne güzellik! 🎨✨",
      "Dur dur dur... bu gerçekten SEN mi çizdin?! 🤯",
      "Partnerin seni hak etmiyor bu yetenekle 💀😂",
      "Müzeye koyulacak seviye! Bravo! 🏛️",
      "AI olarak kıskanıyorum, bu kadar iyi çizemem 🤖💔",
      "Bu çizim ilişkinizden daha güzel 💕🔥",
      "EFSANE! Bunu çerçeveletin! 🖼️",
      "Michelangelo reenkarne olmuş! 👼",
      "100/100 — mükemmellik! ✨",
      "Partnerin şu an aşık oluyor tekrar 💘"
    ],
    en: [
      "Drawing this well is suspicious. Cheating, or is this love? 🕵️",
      "The jury is on its feet. One fainted, ambulance is on the way 🚑",
      "I'm retiring after this one. Nothing tops it 🏆",
      "ARTIST! What beauty! 🎨✨",
      "Wait wait wait... YOU drew this?! 🤯",
      "Your partner doesn't deserve you with this talent 💀😂",
      "Museum-worthy! Bravo! 🏛️",
      "As an AI, I'm jealous — I can't draw this well 🤖💔",
      "This drawing is prettier than your relationship 💕🔥",
      "LEGENDARY! Frame this! 🖼️",
      "Michelangelo reincarnated! 👼",
      "100/100 — perfection! ✨",
      "Your partner is falling in love again 💘"
    ],
    de: [
      "So gut zu zeichnen ist verdächtig. Geschummelt oder Liebe? 🕵️",
      "Die Jury steht. Einer ist ohnmächtig, der Krankenwagen kommt 🚑",
      "KÜNSTLER! Was für eine Schönheit! 🎨✨",
      "Warte... DU hast das gezeichnet?! 🤯",
      "Dein Partner verdient dich nicht mit diesem Talent 💀😂",
      "Museumswürdig! Bravo! 🏛️",
      "Als KI bin ich neidisch — so gut kann ich nicht zeichnen 🤖💔",
      "Diese Zeichnung ist schöner als eure Beziehung 💕🔥",
      "LEGENDÄR! Rahm das ein! 🖼️",
      "Michelangelo wiedergeboren! 👼",
      "100/100 — Perfektion! ✨",
      "Dein Partner verliebt sich gerade neu 💘"
    ],
    es: [
      "Dibujar tan bien es sospechoso. ¿Trampa o es amor? 🕵️",
      "El jurado de pie. Uno se desmayó, la ambulancia viene 🚑",
      "¡ARTISTA! ¡Qué belleza! 🎨✨",
      "Espera... ¿TÚ dibujaste esto?! 🤯",
      "Tu pareja no te merece con este talento 💀😂",
      "¡Digno de museo! ¡Bravo! 🏛️",
      "Como IA, estoy celoso — no puedo dibujar así 🤖💔",
      "Este dibujo es más bonito que su relación 💕🔥",
      "¡LEGENDARIO! ¡Enmárcalo! 🖼️",
      "¡Michelangelo reencarnado! 👼",
      "100/100 — ¡perfección! ✨",
      "Tu pareja se está enamorando de nuevo 💘"
    ]
  }
};

// Word-specific roasts (when the drawing doesn't match the word at all)
const wordMismatchRoasts: RoastTemplate = {
  tr: [
    "Kelime '{word}' idi ama sen bambaşka bir evren çizdin 🌌",
    "'{word}' mı? Bu daha çok '{wrong}' gibi görünüyor 😂",
    "Partnerin '{word}' dedi, sen ne çizdin öyle?! 🫣",
    "'{word}' kelimesini duydun ama beynin başka bir şey işledi 🧠💥",
    "Bu '{word}' değil, bu bir sanat eseri... ama yanlış sanat eseri 🎭"
  ],
  en: [
    "The word was '{word}' but you drew a whole different universe 🌌",
    "'{word}'? This looks more like '{wrong}' 😂",
    "Partner said '{word}', what did YOU draw?! 🫣",
    "You heard '{word}' but your brain processed something else 🧠💥",
    "This isn't '{word}', it's art... but the wrong art 🎭"
  ],
  de: [
    "Das Wort war '{word}' aber du hast ein anderes Universum gezeichnet 🌌",
    "'{word}'? Das sieht eher aus wie '{wrong}' 😂",
    "Partner sagte '{word}', was hast DU gezeichnet?! 🫣",
    "Du hast '{word}' gehört aber dein Gehirn hat was anderes verarbeitet 🧠💥",
    "Das ist nicht '{word}', das ist Kunst... aber die falsche Kunst 🎭"
  ],
  es: [
    "La palabra era '{word}' pero dibujaste un universo diferente 🌌",
    "¿'{word}'? Esto parece más '{wrong}' 😂",
    "Tu pareja dijo '{word}', ¿qué dibujaste TÚ?! 🫣",
    "Escuchaste '{word}' pero tu cerebro procesó otra cosa 🧠💥",
    "Esto no es '{word}', es arte... pero el arte equivocado 🎭"
  ]
};

// Funny wrong guesses for mismatch roasts
const funnyWrongGuesses: Record<string, string[]> = {
  tr: ['patates', 'uzaylı', 'karmaşa', 'leke', 'hayal kırıklığı', 'spagetti', 'bulut', 'böcek'],
  en: ['potato', 'alien', 'chaos', 'blob', 'disappointment', 'spaghetti', 'cloud', 'bug'],
  de: ['Kartoffel', 'Alien', 'Chaos', 'Klecks', 'Enttäuschung', 'Spaghetti', 'Wolke', 'Käfer'],
  es: ['patata', 'alien', 'caos', 'mancha', 'decepción', 'espagueti', 'nube', 'bicho']
};

// Get score category
function getScoreCategory(score: number): string {
  if (score <= 20) return 'terrible';
  if (score <= 40) return 'bad';
  if (score <= 60) return 'okay';
  if (score <= 80) return 'good';
  return 'amazing';
}

// Get a roast based on score
export function getRoast(score: number, word?: string): string {
  const locale = getLocale() as 'tr' | 'en' | 'de' | 'es';
  const category = getScoreCategory(score);
  const roasts = roastsByScore[category][locale];
  
  // 30% chance of word-specific roast if word is provided and score is low
  if (word && score < 50 && Math.random() < 0.3) {
    const mismatchRoasts = wordMismatchRoasts[locale];
    const wrongGuesses = funnyWrongGuesses[locale];
    const roast = mismatchRoasts[Math.floor(Math.random() * mismatchRoasts.length)];
    const wrong = wrongGuesses[Math.floor(Math.random() * wrongGuesses.length)];
    return roast.replace('{word}', word).replace('{wrong}', wrong);
  }
  
  return roasts[Math.floor(Math.random() * roasts.length)];
}

// Get score emoji
export function getScoreEmoji(score: number): string {
  if (score <= 20) return '💀';
  if (score <= 40) return '😅';
  if (score <= 60) return '🤷';
  if (score <= 80) return '🔥';
  return '🏆';
}

// Get score label
export function getScoreLabel(score: number): string {
  const locale = getLocale() as 'tr' | 'en' | 'de' | 'es';
  const labels: Record<string, Record<string, string>> = {
    terrible: { tr: 'Felaket', en: 'Disaster', de: 'Katastrophe', es: 'Desastre' },
    bad: { tr: 'Kötü', en: 'Bad', de: 'Schlecht', es: 'Malo' },
    okay: { tr: 'Fena Değil', en: 'Not Bad', de: 'Nicht Schlecht', es: 'No Está Mal' },
    good: { tr: 'İyi', en: 'Good', de: 'Gut', es: 'Bueno' },
    amazing: { tr: 'Efsane!', en: 'Amazing!', de: 'Fantastisch!', es: '¡Increíble!' }
  };
  const category = getScoreCategory(score);
  return labels[category][locale];
}

// Get score color (for UI)
export function getScoreColor(score: number): string {
  if (score <= 20) return '#ef4444'; // red
  if (score <= 40) return '#f97316'; // orange
  if (score <= 60) return '#eab308'; // yellow
  if (score <= 80) return '#22c55e'; // green
  return '#a855f7'; // purple (legendary)
}
