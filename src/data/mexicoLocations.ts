// Lista completa de estados y municipios de México
export const MEXICO_STATES = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas'
].sort();

export const MUNICIPALITIES_BY_STATE: Record<string, string[]> = {
  'Aguascalientes': ['Aguascalientes', 'Calvillo', 'Jesús María', 'Pabellón de Arteaga', 'Rincón de Romos', 'San José de Gracia'],
  
  'Baja California': ['Ensenada', 'Mexicali', 'Playas de Rosarito', 'Tecate', 'Tijuana'],
  
  'Baja California Sur': ['Comondú', 'La Paz', 'Loreto', 'Los Cabos', 'Mulegé'],
  
  'Campeche': ['Calakmul', 'Calkiní', 'Campeche', 'Candelaria', 'Carmen', 'Champotón', 'Escárcega', 'Hecelchakán', 'Hopelchén', 'Palizada', 'Tenabo'],
  
  'Chiapas': ['Berriozábal', 'Chiapa de Corzo', 'Comitán', 'Ocosingo', 'Palenque', 'San Cristóbal de las Casas', 'Tapachula', 'Tuxtla Gutiérrez', 'Villaflores'],
  
  'Chihuahua': ['Camargo', 'Chihuahua', 'Ciudad Juárez', 'Cuauhtémoc', 'Delicias', 'Hidalgo del Parral', 'Jiménez', 'Nuevo Casas Grandes'],
  
  'Ciudad de México': ['Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán', 'Cuajimalpa', 'Cuauhtémoc', 'Gustavo A. Madero', 'Iztacalco', 'Iztapalapa', 'La Magdalena Contreras', 'Miguel Hidalgo', 'Milpa Alta', 'Tláhuac', 'Tlalpan', 'Venustiano Carranza', 'Xochimilco'],
  
  'Coahuila': ['Acuña', 'Frontera', 'Monclova', 'Parras', 'Piedras Negras', 'Ramos Arizpe', 'Sabinas', 'Saltillo', 'San Pedro', 'Torreón'],
  
  'Colima': ['Armería', 'Colima', 'Comala', 'Coquimatlán', 'Cuauhtémoc', 'Ixtlahuacán', 'Manzanillo', 'Minatitlán', 'Tecomán', 'Villa de Álvarez'],
  
  'Durango': ['Durango', 'Gómez Palacio', 'Guadalupe Victoria', 'Lerdo', 'Nombre de Dios', 'Pueblo Nuevo', 'Santiago Papasquiaro'],
  
  'Estado de México': ['Atizapán de Zaragoza', 'Chalco', 'Chimalhuacán', 'Coacalco', 'Cuautitlán', 'Cuautitlán Izcalli', 'Ecatepec', 'Huixquilucan', 'Ixtapaluca', 'Los Reyes', 'Metepec', 'Naucalpan', 'Nezahualcóyotl', 'Nicolás Romero', 'Tecámac', 'Texcoco', 'Tlalnepantla', 'Toluca', 'Tultitlán', 'Valle de Chalco'],
  
  'Guanajuato': ['Celaya', 'Cortazar', 'Dolores Hidalgo', 'Guanajuato', 'Irapuato', 'León', 'Pénjamo', 'Salamanca', 'San Francisco del Rincón', 'San Miguel de Allende', 'Silao'],
  
  'Guerrero': ['Acapulco', 'Chilapa', 'Chilpancingo', 'Coyuca de Benítez', 'Iguala', 'Taxco', 'Zihuatanejo'],
  
  'Hidalgo': ['Actopan', 'Apan', 'Huejutla', 'Pachuca', 'Tepeapulco', 'Tizayuca', 'Tlaxcoapan', 'Tula de Allende', 'Tulancingo'],
  
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Tlajomulco', 'El Salto', 'Puerto Vallarta', 'Lagos de Moreno', 'Tepatitlán', 'Chapala', 'Arandas', 'Autlán'],
  
  'Michoacán': ['Apatzingán', 'Hidalgo', 'La Piedad', 'Lázaro Cárdenas', 'Morelia', 'Pátzcuaro', 'Sahuayo', 'Uruapan', 'Zacapu', 'Zamora'],
  
  'Morelos': ['Cuautla', 'Cuernavaca', 'Emiliano Zapata', 'Jiutepec', 'Temixco', 'Xochitepec', 'Yautepec'],
  
  'Nayarit': ['Acaponeta', 'Bahía de Banderas', 'Compostela', 'Ixtlán del Río', 'San Blas', 'Santiago Ixcuintla', 'Tecuala', 'Tepic', 'Tuxpan'],
  
  'Nuevo León': ['Apodaca', 'Cadereyta', 'García', 'General Escobedo', 'Guadalupe', 'Linares', 'Montemorelos', 'Monterrey', 'San Nicolás de los Garza', 'San Pedro Garza García', 'Santa Catarina'],
  
  'Oaxaca': ['Huajuapan de León', 'Juchitán', 'Oaxaca de Juárez', 'Puerto Escondido', 'Salina Cruz', 'San Juan Bautista Tuxtepec', 'Santa Cruz Xoxocotlán', 'Tehuantepec'],
  
  'Puebla': ['Atlixco', 'Cholula', 'Huauchinango', 'Puebla', 'San Martín Texmelucan', 'Tehuacán', 'Teziutlán'],
  
  'Querétaro': ['Cadereyta', 'Corregidora', 'El Marqués', 'Querétaro', 'San Juan del Río', 'Tequisquiapan'],
  
  'Quintana Roo': ['Bacalar', 'Benito Juárez', 'Cancún', 'Cozumel', 'Felipe Carrillo Puerto', 'Isla Mujeres', 'Othón P. Blanco', 'Playa del Carmen', 'Puerto Morelos', 'Solidaridad', 'Tulum'],
  
  'San Luis Potosí': ['Ciudad Valles', 'Matehuala', 'Río Verde', 'San Luis Potosí', 'Soledad de Graciano Sánchez'],
  
  'Sinaloa': ['Ahome', 'Culiacán', 'El Fuerte', 'Guasave', 'Los Mochis', 'Mazatlán', 'Navolato'],
  
  'Sonora': ['Agua Prieta', 'Caborca', 'Cajeme', 'Guaymas', 'Hermosillo', 'Navojoa', 'Nogales', 'Puerto Peñasco', 'San Luis Río Colorado'],
  
  'Tabasco': ['Cárdenas', 'Centro', 'Comalcalco', 'Huimanguillo', 'Macuspana', 'Paraíso', 'Teapa', 'Villahermosa'],
  
  'Tamaulipas': ['Altamira', 'Ciudad Madero', 'Ciudad Victoria', 'Matamoros', 'Nuevo Laredo', 'Reynosa', 'Tampico'],
  
  'Tlaxcala': ['Apizaco', 'Chiautempan', 'Huamantla', 'Tlaxcala', 'Zacatelco'],
  
  'Veracruz': ['Boca del Río', 'Coatzacoalcos', 'Córdoba', 'Martínez de la Torre', 'Minatitlán', 'Orizaba', 'Papantla', 'Poza Rica', 'Tuxpan', 'Veracruz', 'Xalapa'],
  
  'Yucatán': ['Kanasín', 'Mérida', 'Progreso', 'Tizimín', 'Uman', 'Valladolid'],
  
  'Zacatecas': ['Fresnillo', 'Guadalupe', 'Jerez', 'Río Grande', 'Sombrerete', 'Zacatecas']
};
