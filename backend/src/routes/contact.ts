import { Router, Request, Response } from 'express';
import { sendContactEmail, sendBugReportEmail } from '../services/emailService';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Submit contact / support message
router.post('/submit', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    await sendContactEmail({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      subject: subject ? String(subject).trim() : undefined,
      message: String(message).trim(),
    });

    return res.json({ success: true, message: 'Message sent successfully!' });
  } catch (error: any) {
    console.error('Failed to send contact email:', error);
    return res.status(500).json({
      message: 'Failed to send message via email. Please try again later or email us directly.',
    });
  }
});

// Submit bug report
router.post('/bug-report', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { bugTitle, bugSteps, platform } = req.body;

    if (!bugTitle || !bugSteps) {
      return res.status(400).json({ message: 'Bug title and steps are required.' });
    }

    const userId = req.userId;
    const userEmail = (req as any).user?.email;
    const userName = (req as any).user?.name;

    await sendBugReportEmail({
      userId,
      userEmail,
      userName,
      bugTitle: String(bugTitle).trim(),
      bugSteps: String(bugSteps).trim(),
      platform: platform || 'CodeOrbit Mobile App',
    });

    return res.json({ success: true, message: 'Bug report received!' });
  } catch (error: any) {
    console.error('Failed to send bug report email:', error);
    return res.status(500).json({ message: 'Failed to send bug report. Please try again.' });
  }
});

export default router;
