export type Image = {
    src: string;
    alt?: string;
    caption?: string;
};

export type Link = {
    text: string;
    href: string;
};

export type Hero = {
    title?: string;
    text?: string;
    image?: Image;
    actions?: Link[];
};

export type Subscribe = {
    title?: string;
    text?: string;
    formUrl: string;
};

export type GiscusConfig = {
    dataRepo: string;
    dataRepoId: string;
    dataCategory: string;
    dataCategoryId: string;
    dataMapping: string;
    dataStrict: string;
    dataReactionsEnabled: string;
    dataEmitMetadata: string;
    dataInputPosition: string;
    dataTheme: string;
    dataLang: string;
    dataLoading: string;
}

export type SiteConfig = {
    logo?: Image;
    author: string;
    title: string;
    heroTitle: string,
    subtitle?: string;
    description: string;
    avatar?: Image;
    image?: Image;
    headerNavLinks?: Link[];
    footerNavLinks?: Link[];
    socialLinks?: Link[];
    hero?: Hero;
    personalizedHero?: boolean;
    subscribe?: Subscribe;
    postsPerPage?: number;
    projectsPerPage?: number;
    giscusConfig?: GiscusConfig;
};

const siteConfig: SiteConfig = {
    heroTitle: "离子键",
    title: "离子键的博客",
    avatar: {
        src: "/assets/kikoshiken.webp",
        alt: "kikoshiken"
    },
    author: "kikoshiken",
    subtitle: "Van!shement Th!s World!!",
    description: 'NAS・fountain pen',
    // image: {
    //     src: '/dante-preview.jpg',
    //     alt: 'Dante - Astro.js and Tailwind CSS theme'
    // },
    headerNavLinks: [
        {
            text: 'Home',
            href: '/'
        },
        // {
        //     text: 'Projects',
        //     href: '/projects'
        // },
        {
            text: 'Blog',
            href: '/blog'
        },
        {
            text: 'Tags',
            href: '/tags'
        },
        // {
        //     text: 'Link',
        //     href: '/link'
        // }
    ],
    footerNavLinks: [
        {
            text: 'About',
            href: '/about'
        },
        {
            text: 'Contact',
            href: '/contact'
        },
        {
            text: 'RSS Feed',
            href: '/rss.xml'
        },
        {
            text: '？？！',
            href: '/anime'
        }
        // {
        //     text: 'Download theme',
        //     href: 'https://github.com/JustGoodUI/dante-astro-theme'
        // }
    ],
    // socialLinks: [
    //     {
    //         text: 'Instagram',
    //         href: 'https://www.instagram.com/aaki_ig?igsh=bjA4M3RncHp3Njhz'
    //     },
    //     {
    //        text: 'X/Twitter',
    //         href: 'https://twitter.com/mikan_chn'
    //     },
    //     {
    //         text: 'GitHub',
    //         href: 'https://github.com/mitian233'
    //     }
    // ],
    // personalizedHero: true,
    // hero: {
    //     title: 'Hi There & Welcome to My Corner of the Web!',
    //     text: "I'm **Ethan Donovan**, a web developer at Amazing Studio, dedicated to the realms of collaboration and artificial intelligence. My approach involves embracing intuition, conducting just enough research, and leveraging aesthetics as a catalyst for exceptional products. I have a profound appreciation for top-notch software, visual design, and the principles of product-led growth. Feel free to explore some of my coding endeavors on <a href='https://github.com/JustGoodUI/dante-astro-theme'>GitHub</a> or follow me on <a href='https://twitter.com/justgoodui'>Twitter/X</a>.",
    //     image: {
    //         src: '/hero.jpeg',
    //         alt: 'A person sitting at a desk in front of a computer'
    //     },
    //     actions: [
    //         {
    //             text: 'Get in Touch',
    //             href: '/contact'
    //         }
    //     ]
    // },
    // subscribe: {
    //     title: 'Subscribe to Dante Newsletter',
    //     text: 'One update per week. All the latest posts directly in your inbox.',
    //     formUrl: '#'
    // },
    postsPerPage: 8,
    projectsPerPage: 8,
    // giscusConfig: {
    //     dataRepo: "",
    //     dataRepoId: "",
    //     dataCategory: "",
    //     dataCategoryId: "",
    //     dataMapping: "pathname",
    //     dataStrict: "0",
    //     dataReactionsEnabled: "1",
    //     dataEmitMetadata: "0",
    //     dataInputPosition: "bottom",
    //     dataTheme: "preferred_color_scheme",
    //     dataLang: "zh-CN",
    //     dataLoading: "lazy"
    // }
};

export default siteConfig;
