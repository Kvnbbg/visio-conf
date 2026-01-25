import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ghostPostTemplates: string[] = require('../data/ghost-post-templates.json');

const TOTAL_GHOST_USERS = 60;
const TOTAL_GHOST_POSTS = 220;

const femaleNames = [
    'Beticia', 'Laura', 'Jilou', 'Ananya', 'Chloé', 'Maya', 'Amina', 'Sofia', 'Isabel', 'Nina',
    'Lea', 'Aya', 'Camille', 'Rina', 'Hana', 'Zoe', 'Lina', 'Claire', 'Elise', 'Mona'
];
const maleNames = [
    'Kevin', 'Marco', 'David', 'Liam', 'Noah', 'Ethan', 'Julien', 'Hugo', 'Omar', 'Leo',
    'Max', 'Alex', 'Victor', 'Samir', 'Jules', 'Rayan', 'Lucas', 'Nico', 'Ilias', 'Theo'
];
const lastNames = [
    'Martin', 'Rivera', 'Chen', 'Dubois', 'Garcia', 'Nguyen', 'Patel', 'Moreau', 'Lemoine', 'Bernard',
    'Fischer', 'Khan', 'Rossi', 'Santos', 'Hernandez', 'Petrov', 'Yamada', 'Kovacs', 'Baker', 'Lopez'
];

const bios = [
    'Digital artist 🎨 | Coffee lover ☕',
    'Tech enthusiast building the future 🚀',
    'Product designer obsessed with flow ✨',
    'Remote work advocate 🌍 | Maker',
    'Code & creativity in equal measure 💡',
    'Building in public, learning fast 📈',
    'UX researcher with a soft spot for communities 🤝',
    'Founder energy, builder mindset 🔧',
    'Minimalist UI, maximalist ambition 🎯',
    'Dreaming, shipping, iterating 🧠'
];

const imageTopics = ['technology', 'workspace', 'design', 'startup', 'coding', 'coffee', 'creative'];

const randomItem = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildHandle = (firstName: string, lastName: string, index: number) => {
    const base = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
    return `@${base}${index > 0 ? index : ''}`;
};

const extractHashtags = (content: string) => {
    const matches = content.match(/#[\w-]+/g);
    return matches ? matches.map((tag) => tag.toLowerCase()) : [];
};

const buildAvatarUrl = (handle: string) => `https://i.pravatar.cc/150?u=${encodeURIComponent(handle)}`;

const buildImageUrl = () => {
    const topic = randomItem(imageTopics);
    return `https://source.unsplash.com/featured/900x600?${encodeURIComponent(topic)}`;
};

const ensureGhostUsers = async () => {
    const ghostUsers = [] as { id: string; handle: string; name: string; avatarUrl: string }[];
    let created = 0;

    while (created < TOTAL_GHOST_USERS) {
        const firstName = randomItem([...femaleNames, ...maleNames]);
        const lastName = randomItem(lastNames);
        const handle = buildHandle(firstName, lastName, created % 3 === 0 ? created : 0);
        const email = `ghost+${handle.replace('@', '')}@visio-conf.local`;
        const displayName = `${firstName} ${lastName}`;
        const avatarUrl = buildAvatarUrl(handle);

        const user = await prisma.user.upsert({
            where: { email },
            update: {
                displayName,
                avatar: avatarUrl,
                isActive: true,
                isVerified: true,
                emailVerified: true,
                emailVerifiedAt: new Date()
            },
            create: {
                email,
                firstName,
                lastName,
                displayName,
                avatar: avatarUrl,
                language: 'en',
                timezone: 'Europe/Paris',
                isActive: true,
                isVerified: true,
                emailVerified: true,
                emailVerifiedAt: new Date()
            }
        });

        await prisma.ghostProfile.upsert({
            where: { userId: user.id },
            update: {
                handle,
                bio: randomItem(bios),
                avatarUrl
            },
            create: {
                userId: user.id,
                handle,
                bio: randomItem(bios),
                avatarUrl
            }
        });

        ghostUsers.push({ id: user.id, handle, name: displayName, avatarUrl });
        created += 1;
    }

    return ghostUsers;
};

const seedGhostPosts = async (ghostUsers: { id: string }[]) => {
    await prisma.socialPost.deleteMany({ where: { isGhost: true } });

    const posts = Array.from({ length: TOTAL_GHOST_POSTS }).map(() => {
        const template = randomItem(ghostPostTemplates);
        const author = randomItem(ghostUsers);
        const createdAt = new Date(Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000));
        const includeImage = Math.random() > 0.65;
        const content = template;
        return {
            authorId: author.id,
            content,
            imageUrl: includeImage ? buildImageUrl() : null,
            hashtags: extractHashtags(content),
            likeCount: randomInt(0, 50),
            viewCount: randomInt(100, 5000),
            reshareCount: randomInt(0, 20),
            saveCount: randomInt(0, 15),
            isGhost: true,
            createdAt,
            updatedAt: createdAt
        };
    });

    await prisma.socialPost.createMany({ data: posts });

    return posts.length;
};

const main = async () => {
    console.log('👻 Seeding ghost users and social posts...');
    const ghostUsers = await ensureGhostUsers();
    console.log(`✅ Ghost users ready: ${ghostUsers.length}`);

    const postCount = await seedGhostPosts(ghostUsers);
    console.log(`✅ Ghost posts seeded: ${postCount}`);
};

main()
    .catch((error) => {
        console.error('❌ Ghost seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
