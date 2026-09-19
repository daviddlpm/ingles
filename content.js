"use strict";
/* ============================================================
   CONTENIDO DEL JUEGO: héroes, historia, misiones y vocabulario
   ({name} se sustituye por el nombre del niño)
   ============================================================ */

const HEROES = [
  { id: 'knight',   name: 'Caballero Valiente', avatar: '🛡️',   desc: 'Protege el reino con su espada mágica' },
  { id: 'princess', name: 'Princesa Guerrera',  avatar: '👸',   desc: 'Líder de la guardia del castillo' },
  { id: 'wizard',   name: 'Mago del Inglés',    avatar: '🧙‍♂️', desc: 'Domina los pergaminos y los hechizos' },
  { id: 'dragon',   name: 'Dragón Amistoso',    avatar: '🐲',   desc: 'Vuela sobre las torres echando chispas' }
];

const MERLIN = { e: '🧙', name: 'Mago Merlín' };
const KING   = { e: '🦹', name: 'Rey Oscuro' };
const PRINCESS = { e: '👸', name: 'Princesa Aria' };

const INTRO_LINES = [
  { who: MERLIN, text: '¡Bienvenido, {name}! Soy Merlín, el mago del reino.' },
  { who: MERLIN, text: 'Hace tiempo, el terrible Rey Oscuro robó la Corona de las Palabras. Desde entonces, nadie en el reino entiende el inglés.' },
  { who: MERLIN, text: '¡Y ha encerrado a la Princesa Aria en su torre oscura!' },
  { who: MERLIN, text: 'Solo un héroe que aprenda 200 palabras mágicas podrá abrir la puerta de la torre. ¿Serás tú, {name}?' },
  { who: MERLIN, text: '¡Empezamos por las tierras de Villaverde! El camino tiene 20 misiones. ¡Vamos!' }
];

const BOSS_INTRO = [
  { who: KING, text: '¡Ja, ja, ja! ¿Quién se atreve a entrar en mi torre?' },
  { who: KING, text: 'Nadie habla inglés mejor que yo… ¡Demuéstrame lo que sabes, {name}!' },
  { who: MERLIN, text: 'Cada respuesta correcta le hará daño. ¡Pero cuidado con tus corazones! Si se acaban, tendrás que volver a intentarlo.' }
];
const BOSS_WIN = [
  { who: KING, text: '¡Noooo! ¡Mi poder se desvanece! ¡Me has vencido con tus palabras!' },
  { who: PRINCESS, text: '¡Lo has conseguido, {name}! ¡Soy libre!' },
  { who: PRINCESS, text: 'El reino vuelve a hablar inglés gracias a ti. ¡Eres el gran héroe del Reino del Inglés!' }
];
const BOSS_LOSE = [
  { who: KING, text: '¡Ja, ja! ¡Todavía te falta practicar, pequeño héroe!' },
  { who: MERLIN, text: 'No te preocupes, {name}. Repasa las palabras difíciles y vuelve a intentarlo. ¡Yo creo en ti!' }
];

const REGIONS = [
  { name: 'Las Tierras de Villaverde', icon: '🌾', from: 1,  to: 5 },
  { name: 'El Bosque Encantado',       icon: '🌲', from: 6,  to: 10 },
  { name: 'Las Montañas Nevadas',      icon: '🏔️', from: 11, to: 15 },
  { name: 'El Castillo Oscuro',        icon: '🏰', from: 16, to: 20 }
];

/* frame: frase con hueco para el ejercicio "completa la frase".
   abstract: las palabras no se dibujan bien con un emoji → se usan traducciones en las fichas. */
const MISSIONS = [
  { id: 1, title: 'El Huerto de los Campesinos', icon: '🌾', biome: 'meadow', frame: 'It is {}.',
    npc: { e: '🧑‍🌾', name: 'Pepe el Campesino' },
    intro: ['¡Ay, {name}! El Rey Oscuro se ha llevado todos los colores de mi huerto.', 'Si aprendes los colores en inglés, ¡el huerto volverá a brillar!'],
    outro: '¡Mira qué colores tan bonitos! Gracias, {name}. Toma esta Semilla Arcoíris.',
    reward: { icon: '🌈', name: 'Semilla Arcoíris' },
    words: [{en:'red',es:'rojo',e:'🔴'},{en:'blue',es:'azul',e:'🔵'},{en:'green',es:'verde',e:'🟢'},{en:'yellow',es:'amarillo',e:'🟡'},{en:'orange',es:'naranja',e:'🟠'},{en:'purple',es:'morado',e:'🟣'},{en:'pink',es:'rosa',e:'🌸'},{en:'black',es:'negro',e:'⚫'},{en:'white',es:'blanco',e:'⚪'},{en:'brown',es:'marrón',e:'🟤'}] },
  { id: 2, title: 'El Conteo de las Ovejas', icon: '🔢', biome: 'meadow', special: 'numbers',
    npc: { e: '👩‍🌾', name: 'Lola la Pastora' },
    intro: ['¡Socorro! Mis ovejas se han escapado y no sé cuántas son.', 'Ayúdame a contarlas en inglés: ¡del uno al diez!'],
    outro: '¡Las diez ovejas están a salvo! Te regalo mi Cencerro Dorado.',
    reward: { icon: '🔔', name: 'Cencerro Dorado' },
    words: [{en:'one',es:'uno',e:'1'},{en:'two',es:'dos',e:'2'},{en:'three',es:'tres',e:'3'},{en:'four',es:'cuatro',e:'4'},{en:'five',es:'cinco',e:'5'},{en:'six',es:'seis',e:'6'},{en:'seven',es:'siete',e:'7'},{en:'eight',es:'ocho',e:'8'},{en:'nine',es:'nueve',e:'9'},{en:'ten',es:'diez',e:'10'}] },
  { id: 3, title: 'Los Animales del Castillo', icon: '🐶', biome: 'village', frame: 'I see {a} {}.',
    npc: { e: '🧔', name: 'Tomás el Establero' },
    intro: ['Los animales del castillo están asustados por el Rey Oscuro.', 'Si les dices sus nombres en inglés, se calmarán.'],
    outro: '¡Ya están tranquilos! Toma esta Pluma de Grifo.',
    reward: { icon: '🪶', name: 'Pluma de Grifo' },
    words: [{en:'dog',es:'perro',e:'🐶'},{en:'cat',es:'gato',e:'🐱'},{en:'bird',es:'pájaro',e:'🐦'},{en:'fish',es:'pez',e:'🐟'},{en:'horse',es:'caballo',e:'🐴'},{en:'cow',es:'vaca',e:'🐮'},{en:'pig',es:'cerdo',e:'🐷'},{en:'lion',es:'león',e:'🦁'},{en:'monkey',es:'mono',e:'🐵'},{en:'elephant',es:'elefante',e:'🐘'}] },
  { id: 4, title: 'El Banquete Real', icon: '🍎', biome: 'village', frame: 'I like the {}.',
    npc: { e: '👨‍🍳', name: 'Chef Gustavo' },
    intro: ['¡Esta noche hay banquete real y la despensa está vacía!', 'Aprende los nombres de la comida en inglés y prepararemos un festín.'],
    outro: '¡Qué banquete! Toma esta Manzana Real.',
    reward: { icon: '🍎', name: 'Manzana Real' },
    words: [{en:'apple',es:'manzana',e:'🍎'},{en:'banana',es:'plátano',e:'🍌'},{en:'bread',es:'pan',e:'🍞'},{en:'milk',es:'leche',e:'🥛'},{en:'water',es:'agua',e:'💧'},{en:'egg',es:'huevo',e:'🥚'},{en:'cheese',es:'queso',e:'🧀'},{en:'pizza',es:'pizza',e:'🍕'},{en:'cake',es:'tarta',e:'🎂'},{en:'cookie',es:'galleta',e:'🍪'}] },
  { id: 5, title: 'La Armadura del Caballero', icon: '👕', biome: 'village', frame: 'Look at the {}.',
    npc: { e: '💂', name: 'Capitán Ramos' },
    intro: ['Un héroe sin armadura no puede enfrentarse al Rey Oscuro.', 'Vamos a vestirte con la ropa del reino, ¡en inglés!'],
    outro: '¡Ahora sí pareces un héroe! Este es el Escudo del Caballero.',
    reward: { icon: '🛡️', name: 'Escudo del Caballero' },
    words: [{en:'shirt',es:'camiseta',e:'👕'},{en:'pants',es:'pantalones',e:'👖'},{en:'shoes',es:'zapatos',e:'👟'},{en:'hat',es:'sombrero',e:'🎩'},{en:'dress',es:'vestido',e:'👗'},{en:'socks',es:'calcetines',e:'🧦'},{en:'jacket',es:'chaqueta',e:'🧥'},{en:'scarf',es:'bufanda',e:'🧣'},{en:'gloves',es:'guantes',e:'🧤'},{en:'boots',es:'botas',e:'👢'}] },
  { id: 6, title: 'Las Estancias de la Torre', icon: '🏠', biome: 'castle', frame: 'Look at the {}.',
    npc: { e: '👩‍🦰', name: 'Doncella Inés' },
    intro: ['¡La torre está patas arriba! No sé dónde está cada cosa.', 'Ayúdame a ponerle nombre en inglés a las cosas de la casa.'],
    outro: '¡Todo en orden! Toma la Llave de la Torre.',
    reward: { icon: '🗝️', name: 'Llave de la Torre' },
    words: [{en:'house',es:'casa',e:'🏠'},{en:'door',es:'puerta',e:'🚪'},{en:'window',es:'ventana',e:'🪟'},{en:'bed',es:'cama',e:'🛏️'},{en:'chair',es:'silla',e:'🪑'},{en:'sofa',es:'sofá',e:'🛋️'},{en:'bath',es:'bañera',e:'🛁'},{en:'lamp',es:'lámpara',e:'💡'},{en:'key',es:'llave',e:'🔑'},{en:'clock',es:'reloj',e:'⏰'}] },
  { id: 7, title: 'La Escuela de Magia', icon: '🎒', biome: 'forest', frame: 'Look at the {}.',
    npc: { e: '🧙‍♀️', name: 'Maestra Ada' },
    intro: ['Bienvenido a la Escuela de Magia. Aquí todos los hechizos se dicen en inglés.', 'Prepara tu mochila y aprende el material del pequeño mago.'],
    outro: '¡Matrícula de honor! Este es tu Pergamino Mágico.',
    reward: { icon: '📜', name: 'Pergamino Mágico' },
    words: [{en:'book',es:'libro',e:'📖'},{en:'pencil',es:'lápiz',e:'✏️'},{en:'pen',es:'bolígrafo',e:'🖊️'},{en:'bag',es:'mochila',e:'🎒'},{en:'scissors',es:'tijeras',e:'✂️'},{en:'crayon',es:'lápiz de cera',e:'🖍️'},{en:'ruler',es:'regla',e:'📏'},{en:'paper',es:'papel',e:'📄'},{en:'school',es:'colegio',e:'🏫'},{en:'teacher',es:'profesor',e:'🧑‍🏫'}] },
  { id: 8, title: 'El Valle de la Naturaleza', icon: '🌈', biome: 'meadow', frame: 'Look at the {}.',
    npc: { e: '🧚', name: 'Hada Flor' },
    intro: ['El valle está triste: el sol, la lluvia y las estrellas se han confundido.', '¡Enséñales sus nombres en inglés a todos los elementos de la naturaleza!'],
    outro: '¡El valle brilla otra vez! Toma esta Flor del Amanecer.',
    reward: { icon: '🌷', name: 'Flor del Amanecer' },
    words: [{en:'sun',es:'sol',e:'☀️'},{en:'rain',es:'lluvia',e:'🌧️'},{en:'snow',es:'nieve',e:'❄️'},{en:'cloud',es:'nube',e:'☁️'},{en:'rainbow',es:'arcoíris',e:'🌈'},{en:'tree',es:'árbol',e:'🌳'},{en:'flower',es:'flor',e:'🌷'},{en:'star',es:'estrella',e:'⭐'},{en:'moon',es:'luna',e:'🌙'},{en:'sea',es:'mar',e:'🌊'}] },
  { id: 9, title: 'El Torneo de Verbos', icon: '🏃', biome: 'village', frame: 'I can {}.',
    npc: { e: '🤺', name: 'Sir Galo' },
    intro: ['¡Bienvenido al Gran Torneo! Aquí no se gana con la espada, sino con verbos.', 'Aprende las acciones en inglés y demuestra todo lo que sabes hacer.'],
    outro: '¡Campeón del torneo! Esta Copa es tuya.',
    reward: { icon: '🏆', name: 'Copa del Torneo' },
    words: [{en:'run',es:'correr',e:'🏃'},{en:'jump',es:'saltar',e:'🤸'},{en:'swim',es:'nadar',e:'🏊'},{en:'dance',es:'bailar',e:'💃'},{en:'sing',es:'cantar',e:'🎤'},{en:'sleep',es:'dormir',e:'😴'},{en:'eat',es:'comer',e:'🍴'},{en:'drink',es:'beber',e:'🥤'},{en:'read',es:'leer',e:'📚'},{en:'play',es:'jugar',e:'🎮'}] },
  { id: 10, title: 'La Fiesta de los Sentimientos', icon: '😊', biome: 'forest', frame: 'I am {}.',
    npc: { e: '🤹', name: 'Bufón Bu' },
    intro: ['¡Fiesta en el bosque! Pero el Rey Oscuro quiere que todos estén tristes.', 'Aprende a decir cómo te sientes en inglés y devolveremos la alegría.'],
    outro: '¡Hurra, todos bailan! Toma la Trompeta de la Fiesta.',
    reward: { icon: '🎺', name: 'Trompeta de la Fiesta' },
    words: [{en:'happy',es:'contento',e:'😊'},{en:'sad',es:'triste',e:'😢'},{en:'angry',es:'enfadado',e:'😠'},{en:'tired',es:'cansado',e:'🥱'},{en:'scared',es:'asustado',e:'😱'},{en:'surprised',es:'sorprendido',e:'😮'},{en:'sick',es:'enfermo',e:'🤒'},{en:'hungry',es:'hambriento',e:'🤤'},{en:'brave',es:'valiente',e:'🦸'},{en:'excited',es:'emocionado',e:'🤩'}] },
  { id: 11, title: 'Los Saludos del Mensajero', icon: '👋', biome: 'village', abstract: true,
    npc: { e: '🏇', name: 'Mensajero Milo' },
    intro: ['Llevo cartas por todo el reino, pero nadie sabe saludar en inglés.', '¡Aprende a saludar y a ser educado, y te daré una carta real!'],
    outro: '¡Qué educado eres! Toma esta Carta Real.',
    reward: { icon: '✉️', name: 'Carta Real' },
    words: [{en:'hello',es:'hola',e:'👋'},{en:'goodbye',es:'adiós',e:'🚶'},{en:'good morning',es:'buenos días',e:'🌅'},{en:'good night',es:'buenas noches',e:'🌙'},{en:'please',es:'por favor',e:'🙏'},{en:'thank you',es:'gracias',e:'💝'},{en:'yes',es:'sí',e:'✅'},{en:'no',es:'no',e:'❌'},{en:'sorry',es:'lo siento',e:'😔'},{en:'welcome',es:'bienvenido',e:'🤗'}] },
  { id: 12, title: 'Los Gigantes Opuestos', icon: '↔️', biome: 'mountain', abstract: true, frame: 'It is {}.',
    npc: { e: '🧌', name: 'Gigante Gruñón' },
    intro: ['¡Soy un gigante enorme, pero no soy malo!', 'Enséñame los opuestos en inglés: grande, pequeño, rápido, lento…'],
    outro: '¡Ahora somos amigos! Toma mi Bota de Gigante.',
    reward: { icon: '🥾', name: 'Bota de Gigante' },
    words: [{en:'big',es:'grande',e:'🐘'},{en:'small',es:'pequeño',e:'🐜'},{en:'fast',es:'rápido',e:'🚀'},{en:'slow',es:'lento',e:'🐢'},{en:'tall',es:'alto',e:'🦒'},{en:'short',es:'bajito',e:'🐧'},{en:'hot',es:'caliente',e:'🔥'},{en:'cold',es:'frío',e:'🧊'},{en:'clean',es:'limpio',e:'🧼'},{en:'dirty',es:'sucio',e:'🐷'}] },
  { id: 13, title: 'El Viaje en Carruaje', icon: '🚗', biome: 'meadow', frame: 'Look at the {}.',
    npc: { e: '🤠', name: 'Cochero Ciro' },
    intro: ['El carruaje real está listo, pero no sé qué transporte usar.', 'Aprende los transportes y los lugares del camino.'],
    outro: '¡Buen viaje! Toma esta Brújula del Viajero.',
    reward: { icon: '🧭', name: 'Brújula del Viajero' },
    words: [{en:'car',es:'coche',e:'🚗'},{en:'bus',es:'autobús',e:'🚌'},{en:'train',es:'tren',e:'🚆'},{en:'plane',es:'avión',e:'✈️'},{en:'bike',es:'bicicleta',e:'🚲'},{en:'boat',es:'barco',e:'⛵'},{en:'street',es:'calle',e:'🛣️'},{en:'shop',es:'tienda',e:'🏪'},{en:'hospital',es:'hospital',e:'🏥'},{en:'park',es:'parque',e:'🏞️'}] },
  { id: 14, title: 'El Mercado Feudal', icon: '🍓', biome: 'village', frame: 'Look at the {}.',
    npc: { e: '👵', name: 'Marta la Mercader' },
    intro: ['¡El mercado está vacío! Faltan frutas y verduras.', 'Dime cómo se llaman en inglés y llenaremos todos los puestos.'],
    outro: '¡Qué mercado tan colorido! Toma esta Bolsa de Monedas.',
    reward: { icon: '💰', name: 'Bolsa de Monedas' },
    words: [{en:'strawberry',es:'fresa',e:'🍓'},{en:'grapes',es:'uvas',e:'🍇'},{en:'watermelon',es:'sandía',e:'🍉'},{en:'pear',es:'pera',e:'🍐'},{en:'lemon',es:'limón',e:'🍋'},{en:'tomato',es:'tomate',e:'🍅'},{en:'carrot',es:'zanahoria',e:'🥕'},{en:'potato',es:'patata',e:'🥔'},{en:'corn',es:'maíz',e:'🌽'},{en:'onion',es:'cebolla',e:'🧅'}] },
  { id: 15, title: 'El Bosque del Dragón', icon: '🐻', biome: 'forest', frame: 'I see {a} {}.',
    npc: { e: '🐉', name: 'Dragón Chispa' },
    intro: ['¡Grrr…! No te asustes, soy un dragón amistoso.', 'Presenta a los animales del bosque en inglés y te dejaré volar conmigo.'],
    outro: '¡Volemos juntos! Toma esta Escama de Dragón.',
    reward: { icon: '🐉', name: 'Escama de Dragón' },
    words: [{en:'bear',es:'oso',e:'🐻'},{en:'rabbit',es:'conejo',e:'🐰'},{en:'mouse',es:'ratón',e:'🐭'},{en:'duck',es:'pato',e:'🦆'},{en:'sheep',es:'oveja',e:'🐑'},{en:'chicken',es:'gallina',e:'🐔'},{en:'frog',es:'rana',e:'🐸'},{en:'snake',es:'serpiente',e:'🐍'},{en:'turtle',es:'tortuga',e:'🐢'},{en:'butterfly',es:'mariposa',e:'🦋'}] },
  { id: 16, title: 'Los Tesoros del Infante', icon: '🧸', biome: 'castle', frame: 'Look at the {}.',
    npc: { e: '👧', name: 'Elena la Niña' },
    intro: ['Los juguetes del infante han desaparecido. ¡Seguro que fue el Rey Oscuro!', 'Ayúdame a encontrarlos diciendo sus nombres en inglés.'],
    outro: '¡Aquí están todos! Toma esta Bola de Cristal.',
    reward: { icon: '🔮', name: 'Bola de Cristal' },
    words: [{en:'ball',es:'pelota',e:'⚽'},{en:'doll',es:'muñeca',e:'🎎'},{en:'robot',es:'robot',e:'🤖'},{en:'teddy bear',es:'osito de peluche',e:'🧸'},{en:'kite',es:'cometa',e:'🪁'},{en:'blocks',es:'bloques',e:'🧱'},{en:'puzzle',es:'puzle',e:'🧩'},{en:'drum',es:'tambor',e:'🥁'},{en:'guitar',es:'guitarra',e:'🎸'},{en:'balloon',es:'globo',e:'🎈'}] },
  { id: 17, title: 'La Tormenta de la Montaña', icon: '⛅', biome: 'mountain', frame: 'It is {}.',
    npc: { e: '🧓', name: 'Ermitaño Nube' },
    intro: ['En la montaña el tiempo se ha vuelto loco: llueve, nieva, hace sol…', 'Aprende el clima y las estaciones en inglés para calmar la tormenta.'],
    outro: '¡Ya sale el sol! Toma este Rayo Embotellado.',
    reward: { icon: '⚡', name: 'Rayo Embotellado' },
    words: [{en:'sunny',es:'soleado',e:'☀️'},{en:'rainy',es:'lluvioso',e:'☔'},{en:'windy',es:'ventoso',e:'🌬️'},{en:'cloudy',es:'nublado',e:'⛅'},{en:'stormy',es:'tormentoso',e:'⛈️'},{en:'snowy',es:'nevado',e:'🌨️'},{en:'foggy',es:'con niebla',e:'🌫️'},{en:'spring',es:'primavera',e:'🌱'},{en:'summer',es:'verano',e:'🏖️'},{en:'winter',es:'invierno',e:'⛄'}] },
  { id: 18, title: 'Las Justas y los Deportes', icon: '🏅', biome: 'village', frame: 'I like {}.',
    npc: { e: '🧔‍♂️', name: 'Entrenador Rocco' },
    intro: ['¡Hoy es día de justas y deportes! ¿Sabes cómo se llaman en inglés?', 'Aprende los deportes y demuestra que eres un atleta del reino.'],
    outro: '¡Medalla de oro! Toma este Arco Dorado.',
    reward: { icon: '🏹', name: 'Arco Dorado' },
    words: [{en:'basketball',es:'baloncesto',e:'🏀'},{en:'tennis',es:'tenis',e:'🎾'},{en:'baseball',es:'béisbol',e:'⚾'},{en:'skiing',es:'esquí',e:'⛷️'},{en:'skating',es:'patinaje',e:'⛸️'},{en:'karate',es:'kárate',e:'🥋'},{en:'surfing',es:'surf',e:'🏄'},{en:'climbing',es:'escalada',e:'🧗'},{en:'bowling',es:'bolos',e:'🎳'},{en:'golf',es:'golf',e:'⛳'}] },
  { id: 19, title: 'Los Oficios del Feudo', icon: '🧑‍🚒', biome: 'village', frame: 'I am {a} {}.',
    npc: { e: '🧑‍🔧', name: 'Maestra del Gremio' },
    intro: ['El Gremio de Oficios necesita ayudantes para reconstruir el reino.', 'Aprende los oficios en inglés y elige el tuyo.'],
    outro: '¡Ya eres del Gremio! Toma este Martillo del Herrero.',
    reward: { icon: '🔨', name: 'Martillo del Herrero' },
    words: [{en:'doctor',es:'médico',e:'🧑‍⚕️'},{en:'police officer',es:'policía',e:'👮'},{en:'firefighter',es:'bombero',e:'🧑‍🚒'},{en:'cook',es:'cocinero',e:'🧑‍🍳'},{en:'farmer',es:'granjero',e:'🧑‍🌾'},{en:'astronaut',es:'astronauta',e:'🧑‍🚀'},{en:'pilot',es:'piloto',e:'🧑‍✈️'},{en:'mechanic',es:'mecánico',e:'🧑‍🔧'},{en:'scientist',es:'científico',e:'🧑‍🔬'},{en:'painter',es:'pintor',e:'🧑‍🎨'}] },
  { id: 20, title: 'El Rescate de la Princesa', icon: '🏰', biome: 'dark', abstract: true,
    npc: { e: '👸', name: 'Princesa Aria' },
    intro: ['¡Estoy encerrada en la torre del Rey Oscuro! ¡Menos mal que has llegado!', 'La puerta solo se abre con frases completas en inglés. ¡Tú puedes!'],
    outro: '¡La puerta se abre! Toma la Corona de las Palabras.',
    reward: { icon: '👑', name: 'Corona de las Palabras' },
    words: [{en:'Hello! How are you?',es:'¡Hola! ¿Cómo estás?',e:'👋😃'},{en:'I love my family',es:'Quiero a mi familia',e:'❤️👨‍👩‍👧‍👦'},{en:'Open your book',es:'Abre tu libro',e:'📖👐'},{en:'Can I go to the toilet?',es:'¿Puedo ir al baño?',e:'🚻❓'},{en:'I like pizza',es:'Me gusta la pizza',e:'🍕👍'},{en:"Let's play football",es:'Vamos a jugar al fútbol',e:'⚽🏃'},{en:'Good morning, wake up',es:'Buenos días, despierta',e:'🌅⏰'},{en:'Thank you very much',es:'Muchas gracias',e:'💝🙏'},{en:'You are my friend',es:'Eres mi amigo',e:'👫❤️'},{en:'I am very happy',es:'Estoy muy contento',e:'😄🎉'}] }
];

/* Rellena datos derivados de cada palabra */
MISSIONS.forEach(m => m.words.forEach((w, i) => {
  w.mid = m.id; w.abs = !!m.abstract; w.key = m.id + ':' + w.en; w.n = i + 1;
}));
const ALL_WORDS = MISSIONS.reduce((a, m) => a.concat(m.words), []);

const CHEST_ITEMS = ['💎','🍀','🦄','🕯️','🪄','🧿','🐚','🎈','🧁','🦋'];

const PRAISE = ['¡Muy bien!','¡Excelente!','¡Fantástico!','¡Eso es!','¡Genial!','¡Bravo, héroe!','¡Magnífico!','¡Perfecto!'];
const TRY_AGAIN = ['¡Casi! Inténtalo otra vez','¡Uy! Prueba de nuevo','¡Ánimo, tú puedes!'];
const MISSED = ['No pasa nada, así se aprende','¡Otra vez lo harás mejor!','¡Sigue, valiente!'];

/* Título, icono e instrucción hablada de cada tipo de ejercicio */
const TYPE_INFO = {
  listenPick: { icon: '👂', name: 'Escucha y toca',        help: 'Escucha la palabra y toca la carta que la representa.' },
  readPick:   { icon: '📖', name: 'Lee y toca',            help: 'Lee la palabra en inglés y toca su carta.' },
  seePick:    { icon: '👀', name: 'Mira y elige',          help: 'Mira el dibujo y toca cómo se dice en inglés.' },
  translate:  { icon: '🔤', name: 'Traduce',               help: 'Toca cómo se dice en inglés.' },
  fill:       { icon: '✏️', name: 'Completa la frase',     help: 'Toca la palabra que falta en la frase.' },
  count:      { icon: '🔢', name: 'Cuenta',                help: 'Cuenta y toca el número en inglés.' },
  math:       { icon: '➕', name: 'Suma mágica',           help: 'Suma y toca el resultado.' },
  match:      { icon: '🧩', name: 'Une las parejas',       help: 'Toca una palabra y luego su pareja.' },
  spell:      { icon: '🔡', name: 'Forma la palabra',      help: 'Toca las letras en orden para escribir la palabra.' },
  order:      { icon: '🧱', name: 'Ordena la frase',       help: 'Toca las palabras en orden para formar la frase.' },
  speak:      { icon: '🎤', name: 'Dilo en voz alta',      help: 'Pulsa el micrófono y di la palabra en voz alta.' }
};
