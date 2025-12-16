/**
 * Service pour déterminer le type de modal à utiliser selon le template
 * 
 * Ce service centralise la logique de détection du modal approprié.
 * Il utilise la même logique que le backend pour garantir la cohérence.
 */

export interface Template {
  id: string;
  name: string;
  description?: string;
}

export type ModalType = 'SmartDeployModal' | 'CreateAutomationModal';

/**
 * Détermine si un template nécessite SmartDeployModal
 * 
 * Cette fonction utilise la même logique que le backend pour garantir
 * la cohérence entre frontend et backend.
 * 
 * @param template - Template à analyser
 * @returns true si SmartDeployModal est requis
 */
export function shouldUseSmartDeployModal(template: Template): boolean {
  const templateNameLower = template.name?.toLowerCase() || '';
  const templateDescLower = template.description?.toLowerCase() || '';
  
  // Workflows CV (Screening ou Analysis)
  const isCV = templateNameLower.includes('cv screening') || 
               templateNameLower.includes('cv analysis') ||
               templateNameLower.includes('candidate evaluation') ||
               templateDescLower.includes('cv screening') ||
               templateDescLower.includes('cv analysis');
  
  // Workflows Email (Gmail Tri, IMAP Tri ou Microsoft Tri)
  const isEmailWorkflow = templateNameLower.includes('gmail tri') ||
                          templateNameLower.includes('imap tri') ||
                          templateNameLower.includes('microsoft tri') ||
                          templateNameLower.includes('email tri') ||
                          templateDescLower.includes('gmail tri') ||
                          templateDescLower.includes('imap tri') ||
                          templateDescLower.includes('microsoft tri');
  
  // Détecter spécifiquement le template Microsoft Tri par ID
  const microsoftTriTemplateId = 'a3b5ba35-aeea-48f4-83d7-34e964a6a8b6';
  const isMicrosoftTriTemplate = template.id === microsoftTriTemplateId || 
                                  templateNameLower.includes('microsoft tri automatique bal');
  
  // Workflows avec injecteur spécifique (PDF Analysis, etc.)
  const hasSpecificInjector = templateNameLower.includes('pdf analysis') ||
                              templateNameLower.includes('résume email') ||
                              templateNameLower.includes('resume email');
  
  // Workflows Production Vidéo IA (Google Drive)
  const isVideoProduction = template.id === 'ndkuzYMKt4nRyRXy' ||
                            template.id === '6a60e84e-b5c1-414d-9f27-5770bc438a64' ||
                            templateNameLower.includes('production vidéo') ||
                            templateNameLower.includes('production video') ||
                            templateNameLower.includes('vidéo ia') ||
                            templateNameLower.includes('video ia');
  
  // Workflows Nextcloud (File Sorting, Sync, etc.)
  const isNextcloudWorkflow = templateNameLower.includes('nextcloud') ||
                              templateDescLower.includes('nextcloud');
  
  // Workflows MCP (Model Context Protocol)
  const isMcpWorkflow = templateNameLower.includes('mcp') ||
                        templateDescLower.includes('mcp') ||
                        template.id === '5916c2c3-d2f8-4895-8165-5048b367d16a';
  
  // Workflows LinkedIn (Post Generator, Token Monitor, OAuth Handler)
  const isLinkedInWorkflow = templateNameLower.includes('linkedin') ||
                             templateDescLower.includes('linkedin');
  
  return isCV || isEmailWorkflow || isMicrosoftTriTemplate || hasSpecificInjector || isVideoProduction || isNextcloudWorkflow || isMcpWorkflow || isLinkedInWorkflow;
}

/**
 * Obtient le type de modal pour un template
 * 
 * @param template - Template à analyser
 * @returns Type de modal à utiliser
 */
export function getTemplateModalType(template: Template): ModalType {
  return shouldUseSmartDeployModal(template) ? 'SmartDeployModal' : 'CreateAutomationModal';
}

