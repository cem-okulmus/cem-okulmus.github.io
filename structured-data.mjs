// Builds the schema.org JSON-LD that build.mjs puts in the page's <head>: a
// ProfilePage about PERSON, plus one ScholarlyArticle (or Thesis) per entry in
// publications.md, linked to PERSON as author. Everything about the papers
// comes from the same fields as the publication cards, so the two can't drift
// apart; only the details about the person below are kept by hand.

const SITE = 'https://cem-okulmus.cv/';

export const PERSON = {
    '@type': 'Person',
    '@id': `${SITE}#me`,
    name: 'Cem Okulmus',
    givenName: 'Cem',
    familyName: 'Okulmus',
    url: SITE,
    image: `${SITE}assets/profile.png`,
    jobTitle: 'Postdoctoral Researcher',
    affiliation: {
        '@type': 'CollegeOrUniversity',
        name: 'Paderborn University',
        url: 'https://www.uni-paderborn.de/en/',
    },
    alumniOf: {
        '@type': 'CollegeOrUniversity',
        name: 'TU Wien',
        url: 'https://www.tuwien.at/en/',
    },
    identifier: {
        '@type': 'PropertyValue',
        propertyID: 'ORCID',
        value: '0000-0002-7742-0439',
    },
    // The same person elsewhere; lets search engines and knowledge graphs
    // connect this page with these profiles.
    sameAs: [
        'https://orcid.org/0000-0002-7742-0439',
        'https://dblp.org/pid/242/1925',
        'https://scholar.google.com/citations?user=YM0FnuYAAAAJ',
        'https://www.wikidata.org/wiki/Q137027463',
        'https://openalex.org/A5003919374',
        'https://github.com/cem-okulmus',
        'https://www.linkedin.com/in/cem-okulmus',
    ],
    knowsAbout: [
        'Learnability and separability over graph-structured data',
        'Temporal ontology-based data access',
        'Ontology-mediated query answering for graph queries',
        'Shape constraint languages',
        'Structural width measures over hypergraphs',
    ],
};

// Links in publications.md may be relative to the site (e.g. assets/...).
const absolute = url => new URL(url, SITE).href;

const list = value => (value || '').split(',').map(item => item.trim()).filter(Boolean);

// Markdown/HTML snippet (e.g. a venue with **bold** parts) to plain text.
function plainText(markdown, marked) {
    return marked.parseInline(markdown)
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
}

// Remarks added to titles on the page, which are not part of the actual title.
const TITLE_REMARK = /\s*\((Accepted|Journal article|short paper|Extended Abstract)\)\s*$/i;

function doiFrom(url) {
    const match = (url || '').match(/^https?:\/\/(?:dx\.)?(?:doi\.org|dl\.acm\.org\/doi)\/(10\.[^?#\s]+)$/i);
    return match ? match[1] : null;
}

function arxivFrom(url) {
    const match = (url || '').match(/arxiv\.org\/(?:abs|pdf)\/([\w.\/-]+?)(?:v\d+)?$|10\.48550\/arXiv\.([\w.-]+)$/i);
    return match ? `https://arxiv.org/abs/${match[1] || match[2]}` : null;
}

// "Volume 49, ACM Transactions on Database Systems (TODS)" is a journal
// volume; any other venue line names the conference or workshop.
function venueNode(line) {
    const volume = line.match(/^Volume\s+(\w+),\s*(.+)$/i);
    if (volume) {
        return {
            '@type': 'PublicationVolume',
            volumeNumber: volume[1],
            isPartOf: { '@type': 'Periodical', name: volume[2] },
        };
    }
    return { '@type': 'CreativeWork', name: line };
}

function publicationNode(pub, marked) {
    const { fields, year } = pub;
    const linkMatch = fields.title.match(/^\[(.+)\]\((.+)\)$/);
    const rawTitle = linkMatch ? linkMatch[1] : fields.title;
    const accepted = /^(true|yes)$/i.test((fields.accepted || '').trim());
    const name = plainText(rawTitle, marked).replace(TITLE_REMARK, '').replace(/\.$/, '');
    const link = linkMatch ? linkMatch[2] : null;
    const doi = doiFrom(link);
    const types = list(fields.type);
    const isThesis = types.includes('Thesis');

    const venues = (fields.venue || '')
        .split('\n')
        .map(line => plainText(line, marked).replace(/^To be presented at the\s+/i, ''))
        .filter(Boolean);

    const authors = (fields.authors || '')
        .split(/,\s*|\s+and\s+/)
        .map(author => author.trim())
        .filter(Boolean)
        .map(author => author === PERSON.name
            ? { '@id': PERSON['@id'] }
            : { '@type': 'Person', name: author });

    const node = {
        '@type': isThesis ? 'Thesis' : 'ScholarlyArticle',
        ...(doi && { '@id': `https://doi.org/${doi}` }),
        name,
        author: authors,
        datePublished: (fields.published || '').trim() || year,
        ...(link && { url: absolute(link) }),
        ...(doi && { identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: doi } }),
        ...(types.length && { genre: types }),
        ...(fields.tags && { keywords: list(fields.tags) }),
        ...(accepted && { creativeWorkStatus: 'Accepted' }),
    };

    if (isThesis) {
        node.inSupportOf = 'PhD';
        const university = venues[0] && venues[0].match(/^PhD Thesis,\s*(.+)$/i);
        if (university) node.sourceOrganization = { '@type': 'CollegeOrUniversity', name: university[1] };
    } else {
        const parts = venues.filter(venue => !/^Preprint$/i.test(venue)).map(venueNode);
        if (parts.length) node.isPartOf = parts.length === 1 ? parts[0] : parts;
    }

    if (fields.pdf) {
        node.encoding = { '@type': 'MediaObject', encodingFormat: 'application/pdf', contentUrl: absolute(fields.pdf) };
    }
    const arxiv = arxivFrom(fields.arxiv) || arxivFrom(fields.pdf);
    if (arxiv) node.sameAs = arxiv;

    return node;
}

// The <script> element to put in <head>. "<" is escaped so no string in the
// data can close the script element early.
export function structuredDataScript(publications, marked) {
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'ProfilePage',
                '@id': SITE,
                url: SITE,
                name: PERSON.name,
                mainEntity: { '@id': PERSON['@id'] },
            },
            PERSON,
            ...publications.map(pub => publicationNode(pub, marked)),
        ],
    };
    const json = JSON.stringify(graph, null, 2).replace(/</g, '\\u003c');
    return `<script type="application/ld+json">\n${json}\n</script>`;
}
