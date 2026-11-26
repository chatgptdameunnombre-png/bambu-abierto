export const RESPONSABLE = { nombre: '', domicilio: '', correo: '' }
export const VERSION_LEGAL = '2026-11-26'
export const FECHA_LEGAL = '26 de noviembre de 2026'
export const CIUDAD = 'Guadalajara, Jalisco'

export const legalListo = (r = RESPONSABLE) => !!(r.nombre.trim() && r.domicilio.trim() && r.correo.trim())
const falta = (que: string) => `[Por completar: ${que}]`
const nombre = () => RESPONSABLE.nombre.trim() || falta('nombre completo del responsable')
const domicilio = () => RESPONSABLE.domicilio.trim() || falta('domicilio')
const correo = () => RESPONSABLE.correo.trim() || falta('correo de privacidad')

export type Seccion = { titulo: string; parrafos: string[] }
export type Documento = { titulo: string; actualizado: string; secciones: Seccion[] }

export const AVISO_CORTO = () => `${nombre()} usa tus datos para darte Bambú: tu cuenta, tus registros, contar repeticiones con la cámara (la imagen no sale de tu teléfono), tus amigos, ligas y retos, y los avisos que actives. No vendemos tus datos ni los usamos para publicidad.`

export function avisoPrivacidad(): Documento {
  return { titulo: 'Aviso de privacidad integral', actualizado: FECHA_LEGAL, secciones: [
    { titulo: 'Quién es responsable de tus datos', parrafos: [`${nombre()}, con domicilio en ${domicilio()}, es responsable del tratamiento de tus datos personales en Bambú. Para cualquier tema de privacidad escribe a ${correo()}.`] },
    { titulo: 'Qué datos usamos', parrafos: [
      'De identificación y contacto: tu nombre o apodo, tu correo y, si entras con Google, el nombre y correo que Google comparte.',
      'De uso de la app: hábitos, tareas, lecturas, rutinas, series, récords, XP, rachas, minutos de redes, amigos, ligas y retos.',
      'De salud y bienestar (datos sensibles): ejercicio que haces, repeticiones y tiempos, y, si los registras, peso, medidas, comida y horas de sueño.',
      'Técnicos: la zona horaria, el identificador para mandarte avisos si los prendes y la información que el navegador guarda en tu teléfono para que la app funcione.',
      'Cámara: la imagen se analiza en tu teléfono y nunca se guarda ni se envía. Solo se guarda el resultado (por ejemplo, 20 lagartijas o 45 segundos).',
      'Las fotos de progreso que tomes se quedan en tu teléfono.',
    ] },
    { titulo: 'Para qué los usamos', parrafos: [
      'Finalidades necesarias para darte el servicio: crear y administrar tu cuenta; guardar y sincronizar tus registros entre dispositivos; contar repeticiones con la cámara; calcular XP, rachas, récords y minutos de redes; mostrar tu perfil, amigos, ligas y retos según lo que elijas; mandarte los avisos que actives; dar seguridad a tu cuenta.',
      'No usamos tus datos para publicidad, no los vendemos y no hacemos perfiles comerciales. No hay finalidades secundarias.',
    ] },
    { titulo: 'Datos sensibles', parrafos: ['Tus datos de salud y bienestar solo se tratan con tu consentimiento expreso, que nos das al marcar la casilla correspondiente. Puedes retirarlo cuando quieras borrando esos registros o tu cuenta.'] },
    { titulo: 'Qué ven otras personas', parrafos: ['Tu apodo, tu avatar, tu nivel y a quién sigues. Si tu cuenta es pública, también tus números de la liga y tus récords; si es privada, solo las personas que aceptes. En un reto, los participantes ven tu marca. Nunca mostramos tu correo.'] },
    { titulo: 'Con quién se comparten', parrafos: [
      'Solo con proveedores que nos ayudan a darte el servicio, como encargados, y no para sus propios fines:',
      'Google LLC (Firebase Authentication y Cloud Firestore): guarda tu cuenta y tus registros. Sus servidores pueden estar fuera de México.',
      'Google, si eliges entrar con Google.',
      'Los servicios de notificaciones de Apple, Google, Mozilla o Microsoft, según tu teléfono: solo para entregar los avisos que prendas; el contenido viaja cifrado.',
      'GitHub (hospedaje de la página).',
      'No hacemos otras transferencias salvo las que exija la ley o una autoridad competente.',
    ] },
    { titulo: 'Cookies y almacenamiento en tu teléfono', parrafos: ['Bambú no usa cookies de publicidad ni herramientas de analítica de terceros. Guarda tu sesión y tus datos en el almacenamiento del navegador de tu teléfono para funcionar sin conexión. Puedes borrarlo saliendo de tu cuenta o borrando los datos del sitio en tu navegador.'] },
    { titulo: 'Tus derechos (ARCO) y cómo ejercerlos', parrafos: [
      `Tienes derecho a acceder a tus datos, rectificarlos, cancelarlos u oponerte a su uso, y a revocar tu consentimiento. Escribe a ${correo()} con tu nombre, el correo de tu cuenta, qué derecho quieres ejercer y, si aplica, una copia de una identificación. Te respondemos en los plazos que marca la ley.`,
      'También puedes borrar tu cuenta y todos tus datos desde Ajustes → Borrar cuenta, corregir tu apodo en Amigos, hacer tu cuenta privada y apagar los avisos cuando quieras.',
    ] },
    { titulo: 'Menores de edad', parrafos: ['Si eres menor de 18 años, usa Bambú con permiso de tu mamá, papá o tutor: esa persona es quien da el consentimiento.'] },
    { titulo: 'Cuánto tiempo los guardamos', parrafos: ['Mientras tengas tu cuenta. Al borrarla, se eliminan de nuestra base de datos; los proveedores pueden conservar copias técnicas por un tiempo limitado según sus políticas.'] },
    { titulo: 'Seguridad', parrafos: ['La conexión va cifrada y las reglas de la base de datos impiden que una cuenta lea o cambie lo que no es suyo.'] },
    { titulo: 'Cambios a este aviso', parrafos: ['Si cambia, lo publicamos aquí con su fecha. Si cambian las finalidades, te pediremos tu consentimiento otra vez.'] },
    { titulo: 'Autoridad', parrafos: ['Si crees que tus derechos no fueron respetados, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno, autoridad en materia de protección de datos personales en posesión de particulares.'] },
  ] }
}

export function terminos(): Documento {
  return { titulo: 'Términos y condiciones', actualizado: FECHA_LEGAL, secciones: [
    { titulo: 'Qué es Bambú', parrafos: [`Bambú es una app gratuita de hábitos, entrenamiento y retos entre amigos, ofrecida por ${nombre()}. Al crear tu cuenta o usar la app aceptas estos términos.`] },
    { titulo: 'Tu cuenta', parrafos: ['Usa datos verdaderos y una sola cuenta por persona, y cuida tu contraseña. Si eres menor de 18 años, necesitas permiso de tu mamá, papá o tutor.'] },
    { titulo: 'Salud y ejercicio', parrafos: [
      'Bambú no es un servicio médico ni sustituye a un profesional de la salud. Consulta a un médico antes de empezar un programa de ejercicio, sobre todo si tienes alguna condición de salud.',
      'Haz los ejercicios bajo tu responsabilidad, en un lugar seguro y con el teléfono bien colocado. Detente si sientes dolor, mareo o falta de aire.',
      'La cámara puede equivocarse: los conteos y tiempos son aproximados.',
    ] },
    { titulo: 'Minutos de redes y candado', parrafos: ['El candado es una herramienta voluntaria de autocontrol que depende de los Atajos de tu iPhone. No garantizamos que bloquee las apps en todos los casos.'] },
    { titulo: 'Amigos, ligas y retos', parrafos: ['Trata con respeto a las demás personas. No uses apodos ofensivos ni te hagas pasar por alguien más, y no hagas trampa en retos ni ligas. Podemos ocultar o borrar perfiles y retos que no respeten estas reglas.'] },
    { titulo: 'El servicio', parrafos: ['Bambú se ofrece gratis y tal como está. Puede cambiar, tener fallas o dejar de estar disponible. Haremos lo razonable para cuidar tus datos, pero te recomendamos no depender de la app para nada crítico.'] },
    { titulo: 'Propiedad intelectual', parrafos: ['La app, su diseño, textos e imágenes pertenecen a sus autores. Tus datos son tuyos.'] },
    { titulo: 'Responsabilidad', parrafos: ['En la medida que lo permita la ley, no respondemos por lesiones derivadas del ejercicio, por decisiones que tomes con base en la app ni por fallas de los servicios de terceros.'] },
    { titulo: 'Terminación', parrafos: ['Puedes borrar tu cuenta cuando quieras desde Ajustes. Podemos suspender cuentas que incumplan estos términos.'] },
    { titulo: 'Cambios', parrafos: ['Si cambian estos términos, lo avisaremos en la app y publicaremos la nueva fecha.'] },
    { titulo: 'Ley aplicable', parrafos: [`Estos términos se rigen por las leyes de México. Para cualquier controversia, los tribunales competentes de ${CIUDAD}, sin perjuicio de los derechos que te da la Ley Federal de Protección al Consumidor.`] },
    { titulo: 'Contacto', parrafos: [`Escríbenos a ${correo()}.`] },
  ] }
}
