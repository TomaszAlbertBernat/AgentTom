#!/usr/bin/env bun

/**
 * Linear Setup Script
 * 
 * This script helps you configure Linear integration by:
 * 1. Checking if LINEAR_API_KEY is set
 * 2. Fetching available teams and users
 * 3. Providing recommendations for team and assignee IDs
 * 4. Optionally updating your .env file
 */

import { LinearClient } from '@linear/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface LinearConfig {
  teamId: string;
  assigneeId: string;
}

class LinearSetup {
  private linearClient: LinearClient | null = null;
  private envPath = join(process.cwd(), '.env');

  constructor() {
    this.checkApiKey();
  }

  private checkApiKey() {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      console.error('❌ LINEAR_API_KEY not found in environment variables.');
      console.log('\n📋 To set up Linear integration:');
      console.log('1. Go to https://linear.app/settings/api');
      console.log('2. Create a personal API key');
      console.log('3. Add it to your .env file: LINEAR_API_KEY=lin_api_...');
      process.exit(1);
    }

    try {
      this.linearClient = new LinearClient({ apiKey });
      console.log('✅ Linear API key found and client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Linear client:', error);
      process.exit(1);
    }
  }

  async fetchTeams() {
    if (!this.linearClient) throw new Error('Linear client not initialized');
    
    console.log('🔍 Fetching teams...');
    const teams = await this.linearClient.teams();
    return teams.nodes;
  }

  async fetchUsers() {
    if (!this.linearClient) throw new Error('Linear client not initialized');
    
    console.log('🔍 Fetching users...');
    const users = await this.linearClient.users();
    return users.nodes.filter(user => user.active);
  }

  async getRecommendations(): Promise<LinearConfig> {
    const [teams, users] = await Promise.all([
      this.fetchTeams(),
      this.fetchUsers()
    ]);

    if (teams.length === 0) {
      throw new Error('No teams found in your Linear workspace');
    }

    if (users.length === 0) {
      throw new Error('No active users found in your Linear workspace');
    }

    // Recommend first team and current user (or first user if can't detect current)
    const recommendedTeam = teams[0];
    const currentUser = users.find(user => user.email);
    const recommendedUser = currentUser || users[0];

    console.log('\n🎯 Recommendations:');
    console.log(`📁 Team: ${recommendedTeam.name} (${recommendedTeam.key})`);
    console.log(`👤 Assignee: ${recommendedUser.name} (${recommendedUser.email || 'no email'})`);

    return {
      teamId: recommendedTeam.id,
      assigneeId: recommendedUser.id
    };
  }

  displayOptions(teams: any[], users: any[]) {
    console.log('\n📋 Available Teams:');
    teams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name} (${team.key}) - ID: ${team.id}`);
    });

    console.log('\n👥 Available Users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} ${user.email ? `(${user.email})` : ''} - ID: ${user.id}`);
    });
  }

  updateEnvFile(config: LinearConfig) {
    if (!existsSync(this.envPath)) {
      console.log('❌ .env file not found. Please create one first.');
      return false;
    }

    let envContent = readFileSync(this.envPath, 'utf-8');
    
    // Update or add LINEAR_DEFAULT_TEAM_ID
    if (envContent.includes('LINEAR_DEFAULT_TEAM_ID=')) {
      envContent = envContent.replace(
        /LINEAR_DEFAULT_TEAM_ID=.*/,
        `LINEAR_DEFAULT_TEAM_ID=${config.teamId}`
      );
    } else {
      envContent += `\nLINEAR_DEFAULT_TEAM_ID=${config.teamId}`;
    }

    // Update or add LINEAR_DEFAULT_ASSIGNEE_ID
    if (envContent.includes('LINEAR_DEFAULT_ASSIGNEE_ID=')) {
      envContent = envContent.replace(
        /LINEAR_DEFAULT_ASSIGNEE_ID=.*/,
        `LINEAR_DEFAULT_ASSIGNEE_ID=${config.assigneeId}`
      );
    } else {
      envContent += `\nLINEAR_DEFAULT_ASSIGNEE_ID=${config.assigneeId}`;
    }

    writeFileSync(this.envPath, envContent);
    console.log('✅ .env file updated successfully');
    return true;
  }

  async run() {
    try {
      console.log('🚀 Setting up Linear integration...\n');

      const [teams, users] = await Promise.all([
        this.fetchTeams(),
        this.fetchUsers()
      ]);

      this.displayOptions(teams, users);
      const recommendations = await this.getRecommendations();

      console.log('\n🔧 Environment Variables to Add:');
      console.log(`LINEAR_DEFAULT_TEAM_ID=${recommendations.teamId}`);
      console.log(`LINEAR_DEFAULT_ASSIGNEE_ID=${recommendations.assigneeId}`);

      // Auto-update .env file
      console.log('\n⚡ Auto-updating .env file...');
      const updated = this.updateEnvFile(recommendations);

      if (updated) {
        console.log('\n🎉 Linear setup completed successfully!');
        console.log('📝 Please restart your application to apply the changes.');
        console.log('\n🔗 You can now use Linear commands in your AGI chat:');
        console.log('   • "Create a task for implementing the new feature"');
        console.log('   • "Show me my current tasks"');
        console.log('   • "Update the task status to done"');
      } else {
        console.log('\n⚠️  Please manually add the environment variables to your .env file.');
      }

    } catch (error) {
      console.error('❌ Setup failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}

// Run the setup
const setup = new LinearSetup();
setup.run().catch(console.error); 