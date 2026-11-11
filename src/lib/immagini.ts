/** Immagini d'identità delle materie; i contenuti didattici restano negli appunti. */
export interface ImmagineMateria {
  file: string;
  alt: string;
  posizione: string;
  autore: string;
  fonte: string;
  licenza: string;
  urlLicenza: string | null;
}

const immagini: Record<string, ImmagineMateria> = {
  'diritto-pubblico': {
    file: 'montecitorio',
    alt: 'La facciata di Palazzo Montecitorio a Roma',
    posizione: '50% 70%',
    autore: 'Rémi Jouan / Wikimedia Commons',
    fonte: 'https://commons.wikimedia.org/wiki/File:Palais_Montecitorio.jpg',
    licenza: 'CC BY-SA 3.0',
    urlLicenza: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  sociologia: {
    file: 'societa',
    alt: 'Mercato e vita di strada a Mulberry Street, New York, circa 1900',
    posizione: '50% 58%',
    autore: 'Detroit Publishing Co. / Library of Congress',
    fonte: 'https://www.loc.gov/pictures/item/2016800172/',
    licenza: 'Nessuna restrizione nota alla pubblicazione',
    urlLicenza: null,
  },
};

export const immagineMateria = (slug: string): ImmagineMateria | null => immagini[slug] ?? null;
export const creditiImmagini = Object.values(immagini);
