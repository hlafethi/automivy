import { apiClient } from '../lib/api';
import { EmailCredential } from '../types';

export class EmailCredentialService {
  static async getEmailCredentials(): Promise<EmailCredential[]> {
    return apiClient.getEmailCredentials();
  }

  static async hasEmailCredentials(): Promise<boolean> {
    try {
      const credentials = await this.getEmailCredentials();
      return credentials.length > 0;
    } catch {
      return false;
    }
  }

  static async createEmailCredential(credentialData: {
    name: string;
    imapHost: string;
    imapPort: number;
    imapUser: string;
    imapPassword: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
  }): Promise<EmailCredential> {
    return apiClient.createEmailCredential(credentialData);
  }

  static async deleteEmailCredential(id: string): Promise<void> {
    await apiClient.deleteEmailCredential(id);
  }

  static async createOrUpdateEmailCredential(credentialData: {
    name: string;
    imapHost: string;
    imapPort: number;
    imapUser: string;
    imapPassword: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
  }): Promise<EmailCredential> {
    return this.createEmailCredential(credentialData);
  }
}