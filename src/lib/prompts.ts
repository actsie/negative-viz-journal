import { Prompt } from './database';

// Seeded prompts for the negative visualization practice
export const SEED_PROMPTS: Omit<Prompt, 'id' | 'created_at' | 'archived' | 'source'>[] = [
  {
    text: "Imagine losing your current home or living situation",
    gratitude_prompt: "What aspects of your current living situation do you appreciate most?",
  },
  {
    text: "Consider if you lost your ability to communicate with loved ones",
    gratitude_prompt: "Who in your life are you most grateful to be able to connect with?",
  },
  {
    text: "Visualize losing your current health and mobility",
    gratitude_prompt: "What physical abilities or aspects of your health do you value most?",
  },
  {
    text: "Imagine your primary source of income disappearing",
    gratitude_prompt: "What opportunities or resources do you currently have that support you?",
  },
  {
    text: "Consider losing access to the internet and digital connections",
    gratitude_prompt: "What digital tools or online communities add value to your life?",
  },
  {
    text: "Visualize losing your independence and needing constant care",
    gratitude_prompt: "What aspects of your independence and autonomy do you cherish?",
  },
  {
    text: "Imagine being unable to pursue your hobbies or interests",
    gratitude_prompt: "What activities or interests bring you the most joy and fulfillment?",
  },
  {
    text: "Consider losing your ability to learn new things",
    gratitude_prompt: "What recent learning or growth experiences have you valued?",
  },
  {
    text: "Visualize losing access to nature and the outdoors",
    gratitude_prompt: "What aspects of the natural world do you find most meaningful?",
  },
  {
    text: "Imagine being unable to help or support others",
    gratitude_prompt: "How has being able to contribute to others' lives enriched your own?",
  }
];

// Utility functions for prompt management
export const promptUtils = {
  // Generate a deterministic pseudo-random prompt for today
  getTodayPrompt(installDate: string, prompts: Prompt[]): Prompt {
    const seedPrompts = prompts.filter(p => p.source === 'seed' && !p.archived);
    if (seedPrompts.length === 0) {
      throw new Error('No seed prompts available');
    }

    // Use install date + current date as seed for deterministic selection
    const today = new Date();
    const daysSinceInstall = Math.floor((today.getTime() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24));
    
    // Simple pseudo-random selection based on days since install
    const index = this.pseudoRandom(daysSinceInstall) % seedPrompts.length;
    return seedPrompts[index];
  },

  // Get a different prompt for swap (avoiding recent prompts)
  getSwapPrompt(currentPromptId: string, lastPromptId: string | undefined, prompts: Prompt[]): Prompt {
    const seedPrompts = prompts.filter(p => 
      p.source === 'seed' && 
      !p.archived && 
      p.id !== currentPromptId &&
      p.id !== lastPromptId
    );

    if (seedPrompts.length === 0) {
      // If no alternatives available, return current prompt (no swap possible)
      const current = prompts.find(p => p.id === currentPromptId);
      if (!current) throw new Error('Current prompt not found');
      return current;
    }

    // Random selection from available alternatives
    const randomIndex = Math.floor(Math.random() * seedPrompts.length);
    return seedPrompts[randomIndex];
  },

  // Simple linear congruential generator for pseudo-random numbers
  pseudoRandom(seed: number): number {
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    return (a * seed + c) % m;
  },

  // Check if user can swap today
  canSwapToday(swapUsedDate: string | undefined): boolean {
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
                       String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(today.getDate()).padStart(2, '0');
    
    return swapUsedDate !== todayString;
  },

  // Get today's date as string
  getTodayString(): string {
    const today = new Date();
    return today.getFullYear() + '-' + 
           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
           String(today.getDate()).padStart(2, '0');
  },

  // Perform swap and update settings
  async swapTodayPrompt(installDate: string): Promise<{ success: boolean; newPrompt?: Prompt; error?: string }> {
    try {
      const { db } = await import('./database');
      
      // Get current settings
      const settings = await db.settings.get('main');
      if (!settings) {
        return { success: false, error: 'Settings not found' };
      }

      // Check if swap is allowed today
      if (!this.canSwapToday(settings.swapUsedDate)) {
        return { success: false, error: 'You can only swap once per day. Try again tomorrow.' };
      }

      // Get all prompts
      const allPrompts = await db.prompts.toArray();
      const currentPrompt = this.getTodayPrompt(installDate, allPrompts);
      
      // Get a different prompt for swap
      const newPrompt = this.getSwapPrompt(currentPrompt.id, settings.lastPromptId, allPrompts);
      
      // If no different prompt available
      if (newPrompt.id === currentPrompt.id) {
        return { success: false, error: 'No alternative prompts available for swap' };
      }

      // Update settings to mark swap as used today and update last prompt
      const todayString = this.getTodayString();
      await db.settings.put({
        ...settings,
        swapUsedDate: todayString,
        lastPromptDate: todayString,
        lastPromptId: newPrompt.id
      });

      return { success: true, newPrompt };
    } catch (error) {
      console.error('Failed to swap prompt:', error);
      return { success: false, error: 'Failed to swap prompt. Please try again.' };
    }
  },

  // Get current prompt considering any swaps
  async getCurrentPrompt(installDate: string): Promise<Prompt> {
    try {
      const { db } = await import('./database');
      
      // Get current settings
      const settings = await db.settings.get('main');
      const todayString = this.getTodayString();
      
      // If user has swapped today, return the swapped prompt
      if (settings?.swapUsedDate === todayString && settings?.lastPromptId) {
        const allPrompts = await db.prompts.toArray();
        const swappedPrompt = allPrompts.find(p => p.id === settings.lastPromptId);
        if (swappedPrompt) {
          return swappedPrompt;
        }
      }
      
      // Otherwise return the default prompt for today
      const allPrompts = await db.prompts.toArray();
      return this.getTodayPrompt(installDate, allPrompts);
    } catch (error) {
      console.error('Failed to get current prompt from database:', error);
      
      // Fallback: return a hardcoded prompt from SEED_PROMPTS
      return this.getFallbackPrompt(installDate);
    }
  },

  // Fallback prompt when database is unavailable
  getFallbackPrompt(installDate: string): Prompt {
    try {
      // Use the same deterministic logic but with hardcoded prompts
      const today = new Date();
      const daysSinceInstall = Math.floor((today.getTime() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24));
      const index = this.pseudoRandom(daysSinceInstall) % SEED_PROMPTS.length;
      const selectedSeed = SEED_PROMPTS[index];
      
      return {
        id: `seed-${index + 1}`,
        text: selectedSeed.text,
        gratitude_prompt: selectedSeed.gratitude_prompt,
        archived: false,
        source: 'seed',
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Fallback prompt generation failed:', error);
      
      // Ultimate fallback - return first prompt
      return {
        id: 'fallback-1',
        text: SEED_PROMPTS[0].text,
        gratitude_prompt: SEED_PROMPTS[0].gratitude_prompt,
        archived: false,
        source: 'seed',
        created_at: new Date().toISOString(),
      };
    }
  },

  // Check if local storage is available and working
  async isStorageAvailable(): Promise<{ available: boolean; error?: string }> {
    try {
      const { db } = await import('./database');
      
      // Try a simple read operation
      await db.settings.get('main');
      return { available: true };
    } catch (error) {
      console.error('Storage availability check failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
      return { 
        available: false, 
        error: errorMessage.includes('QuotaExceededError') 
          ? 'Storage quota exceeded - please free up space'
          : errorMessage.includes('NotFoundError')
          ? 'Database not accessible - using session storage'
          : 'Storage is unavailable - using session storage'
      };
    }
  },

  // Initialize seed prompts in database
  async initializeSeedPrompts(): Promise<void> {
    const { db } = await import('./database');
    
    // Check if seed prompts already exist
    const existingSeeds = await db.prompts.where('source').equals('seed').count();
    if (existingSeeds > 0) return;

    // Add seed prompts
    const seedPrompts: Prompt[] = SEED_PROMPTS.map((prompt, index) => ({
      id: `seed-${index + 1}`,
      ...prompt,
      archived: false,
      source: 'seed',
      created_at: new Date().toISOString(),
    }));

    await db.prompts.bulkAdd(seedPrompts);
  },
};