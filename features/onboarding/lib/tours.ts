import type { Tour } from 'onborda/dist/types';

export const onboardingTours: Tour[] = [
    {
        tour: 'admin-welcome',
        steps: [
            {
                icon: '👋',
                title: 'Command Center',
                content: 'Welcome! This sidebar is your mission control. From here, you can access every aspect of your agency\'s operations, from pipeline management to financial oversight.',
                selector: '#sidebar-trigger',
                side: 'right',
            },
            {
                icon: '🚀',
                title: 'Pipeline Management',
                content: 'Track your leads from initial inquiry to closed deal. Monitor conversion rates, manage prospects, and ensure no opportunity slips through the cracks.',
                selector: '#nav-pipeline',
                side: 'right',
            },
            {
                icon: '💰',
                title: 'Financial Intelligence',
                content: 'Keep a finger on the pulse of your business. Generate professional invoices, track revenue streams, and manage expenses all in one secure location.',
                selector: '#nav-financials',
                side: 'right',
            },
            {
                icon: '🏗️',
                title: 'Project Oversight',
                content: 'Oversee active client projects. Note: You can press Cmd+K anytime to jump instantly to any project, client, or setting.',
                selector: '#nav-projects',
                side: 'right',
            },
        ],
    },
    {
        tour: 'client-welcome',
        steps: [
            {
                icon: '👋',
                title: 'Your Project Portal',
                content: 'Welcome to your dedicated project space. This is where we collaborate, share updates, and bring your vision to life.',
                selector: 'h1',
                side: 'bottom',
            },
            {
                icon: '📋',
                title: 'Project Requirements',
                content: 'We need your input to move forward. Please check this section for any outstanding items, documents, or approvals we need from you.',
                selector: '#nav-requirements',
                side: 'right',
            },
            {
                icon: '💳',
                title: 'Transparent Billing',
                content: 'View your payment history, download invoices, and settle outstanding balances securely. We believe in complete financial transparency.',
                selector: '#nav-payments',
                side: 'right',
            },
            {
                icon: '💬',
                title: 'Direct Communication',
                content: 'Have a question? Start a conversation with your project manager directly here. No more lost emails.',
                selector: '#nav-conversations',
                side: 'right',
            },
        ],
    },
    {
        tour: 'dev-welcome',
        steps: [
            {
                icon: '⚡',
                title: 'Developer Workspace',
                content: 'Your focused environment for high-impact work. Use this dashboard to track your active tasks and deadlines.',
                selector: 'h1',
                side: 'bottom',
            },
            {
                icon: '🔥',
                title: 'Maintenance Pulse',
                content: 'Consistency is key. Complete your daily \'Pulse\' checks to maintain your streak and ensure system health.',
                selector: '#nav-pulse',
                side: 'right',
            },
            {
                icon: '⏱️',
                title: 'Accurate Reporting',
                content: 'Log your hours directly against deliverables. Accurate time tracking ensures fair compensation and helps us optimize project scopes.',
                selector: '#nav-time-reports',
                side: 'right',
            },
        ],
    },
    {
        tour: 'dfy-welcome',
        steps: [
            {
                icon: '🤝',
                title: 'Your Agency HQ',
                content: 'Welcome. This is the control center for your business. Track your deal flow and monitor your agency\'s revenue growth.',
                selector: 'h1',
                side: 'bottom',
            },
            {
                icon: '💎',
                title: 'Your Service Catalog',
                content: 'Access your \'Blueprints\' – the service packages you offer to your clients. You sell the vision; we operate as your dedicated fulfillment team.',
                selector: '#nav-opportunities',
                side: 'right',
            },
            {
                icon: '📈',
                title: 'Revenue & Earnings',
                content: 'Monitor your business performance. Track your retained earnings and view the financial health of your agency operations.',
                selector: '#nav-commissions',
                side: 'right',
            },
        ],
    },
];
