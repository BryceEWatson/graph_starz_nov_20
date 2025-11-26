import { GraphData, NodeType, GraphNode, GraphLink } from './types';

// --- GENERATOR LOGIC FOR POWER USER DATA ---

const generatePowerUserData = (): GraphData => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Define image aspect ratios for variety
  const imageDimensions = [
    { width: 600, height: 400 }, // Landscape
    { width: 700, height: 450 }, // Landscape wide
    { width: 400, height: 600 }, // Portrait
    { width: 450, height: 700 }, // Portrait tall
    { width: 500, height: 500 }, // Square
    { width: 800, height: 500 }, // Wide landscape
    { width: 500, height: 800 }, // Tall portrait
  ];

  // 1. Define Categories/Attributes
  // We group them to create visual clusters in the graph
  const categories = [
    { name: 'Nature', tags: ['Landscape', 'Forest', 'Mountains', 'River', 'Sunset'] },
    { name: 'Urban', tags: ['Architecture', 'City', 'Street', 'Concrete', 'Night'] },
    { name: 'Tech', tags: ['Cyberpunk', 'Neon', 'Code', 'Future', 'AI'] },
    { name: 'Art', tags: ['Abstract', 'Minimal', 'Surreal', 'Vintage', 'BW'] },
    { name: 'People', tags: ['Portrait', 'Fashion', 'Candid', 'Studio', 'Crowd'] },
  ];

  // Flatten attributes for node creation
  const allTags = Array.from(new Set(categories.flatMap(c => c.tags).concat(categories.map(c => c.name))));
  
  // Colors as shared attributes
  const colors = ['Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple', 'Black', 'White'];
  allTags.push(...colors);

  // Create Attribute Nodes (STARS)
  allTags.forEach((tag, index) => {
    nodes.push({
      id: `attr-${tag}`,
      type: NodeType.ATTRIBUTE,
      label: tag,
      radius: 4 + Math.random() * 4, // Small "Star" radius
      x: Math.random() * 1000,
      y: Math.random() * 1000,
    });
  });

  // 2. Define Users with specific "Personas"
  const users = [
    { id: 'u1', name: 'Alex Lens', avatar: 64, focus: ['Nature', 'Landscape', 'Green', 'Blue'] },
    { id: 'u2', name: 'Sarah Design', avatar: 65, focus: ['Art', 'Abstract', 'Red', 'Minimal'] },
    { id: 'u3', name: 'Mike Street', avatar: 91, focus: ['Urban', 'City', 'Black', 'Concrete'] },
    { id: 'u4', name: 'Jess Tech', avatar: 103, focus: ['Tech', 'Neon', 'Purple', 'Future'] },
    { id: 'u5', name: 'Portrait Pete', avatar: 177, focus: ['People', 'Portrait', 'Studio', 'Fashion'] },
  ];

  users.forEach((user, uIdx) => {
    // Create User Node - keep avatars mostly square for consistency
    const avatarSize = 200;
    nodes.push({
      id: user.id,
      type: NodeType.USER,
      label: user.name,
      radius: 40,
      image: `https://picsum.photos/id/${user.avatar}/${avatarSize}/${avatarSize}`,
      attributes: [],
      x: Math.random() * 1000,
      y: Math.random() * 1000,
    });

    // 3. Generate Images for each User
    // 5 to 12 images per user
    const numImages = 6 + Math.floor(Math.random() * 7); 
    
    for (let i = 0; i < numImages; i++) {
      const imgId = `img-${user.id}-${i}`;
      // Deterministic image ID from Lorem Picsum
      const picId = 100 + (uIdx * 30) + i;

      // Pick a main theme from user's focus
      const mainTheme = user.focus[i % user.focus.length];

      // Pick 2-4 random attributes
      const imgAttrs = new Set<string>();
      imgAttrs.add(mainTheme); // Always include one core theme tag

      // Add 1-2 more from user focus
      imgAttrs.add(user.focus[Math.floor(Math.random() * user.focus.length)]);

      // Add 1-2 random "Global" attributes for cross-linking (e.g., a Nature shot that is also "Blue")
      const randomTag = allTags[Math.floor(Math.random() * allTags.length)];
      imgAttrs.add(randomTag);

      const attrArray = Array.from(imgAttrs);

      // Pick a random aspect ratio for this image
      const dimensions = imageDimensions[i % imageDimensions.length];

      nodes.push({
        id: imgId,
        type: NodeType.IMAGE,
        label: `${mainTheme} Shot ${i + 1}`,
        description: `A stunning capture by ${user.name} focusing on ${mainTheme} elements.`,
        radius: 35,
        image: `https://picsum.photos/id/${picId}/${dimensions.width}/${dimensions.height}`,
        attributes: attrArray,
        x: Math.random() * 1000,
        y: Math.random() * 1000,
      });

      // LINK: User -> Image (Ownership)
      links.push({
        source: user.id,
        target: imgId,
        type: 'UPLOADED',
        strength: 0.9 // Strong pull to user
      });

      // LINK: Image -> Attributes
      attrArray.forEach(attr => {
        const targetAttrNode = nodes.find(n => n.label === attr);
        if (targetAttrNode) {
          links.push({
            source: imgId,
            target: targetAttrNode.id,
            type: 'HAS_ATTRIBUTE',
            strength: 0.3 // Weaker pull to attributes to allow graph to spread
          });
        }
      });
    }
  });

  return { nodes, links };
};

export const INITIAL_GRAPH_DATA: GraphData = generatePowerUserData();

export const MOCK_DELAY = 1500;