import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import PDFDocument from 'pdfkit';

export const exportPdf = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=travelmate-${type}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Header
    doc
      .fontSize(24)
      .fillColor('#1a6b3c')
      .text('TravelMate', { align: 'center' })
      .fontSize(12)
      .fillColor('#666')
      .text('Generated: ' + new Date().toLocaleDateString(), { align: 'center' })
      .moveDown(2);

    if (type === 'sitemap') {
      doc.fontSize(18).fillColor('#000').text('Application Sitemap');
      doc.moveDown();
      const pages = [
        ['Home / Ride Dashboard', ['Search Rides (full-text + geospatial)', 'Popular Routes', 'Your Activity (bookings, completions, rating)']],
        ['Bookings', ['My Booking Requests', 'Ride History', 'Active bookings (pending / accepted / completed)']],
        ['Wallet', ['Total Balance (available, pending, held)', 'Withdraw Funds', 'Quick Services: Airtime, Data, Bills, Fund', 'Transactions & Escrow', 'Earnings Overview (week/month/year)']],
        ['Chats', ['Message thread list', 'Per-ride chat window', 'Driver/Rider direct messaging']],
        ['Profile', ['Edit Profile & Avatar', 'KYC Verification', 'Ride History', 'Referral Program', 'Promo Codes', 'Privacy & Security', 'Notification Settings', 'Help & Support', 'Auth Diagnostics', 'PDF Export', 'Terms & Policies', 'About', 'Logout / Delete Account']],
      ];
      pages.forEach(([section, items]) => {
        doc.fontSize(13).fillColor('#1a6b3c').text(String(section));
        (items as string[]).forEach(item => {
          doc.fontSize(11).fillColor('#333').text(`   • ${item}`);
        });
        doc.moveDown(0.5);
      });
    } else if (type === 'features') {
      doc.fontSize(18).fillColor('#000').text('Features Overview');
      doc.moveDown();
      const features = [
        ['🚗 Ride Sharing', 'Driver/Rider matching with geospatial search. Supports exact and nearby route discovery.'],
        ['💰 In-App Wallet & Escrow', 'Wallet funding via card (Paystack), peer-to-peer payments, escrow holds for ride completion.'],
        ['📱 Value Added Services', 'Buy airtime, data, pay electricity & cable bills directly from the wallet.'],
        ['💬 Real-Time Messaging', 'Per-ride chat thread between driver and each passenger. Unread message badge.'],
        ['🔐 KYC Verification', 'Multi-step identity verification: bank account, face scan, NIN/BVN ID check.'],
        ['🎁 Referral Program', 'Unique referral codes per user. ₦1,000 bonus for referee, ₦2,000 reward for referrer on completion.'],
        ['🏷️ Promo Codes', 'Time-limited discount codes with percentage off, max discount cap, and minimum booking constraints.'],
        ['🔔 Notification Settings', 'Granular toggle preferences: push, email, SMS, per event-type (payments, trips, messages, etc).'],
        ['📄 PDF Export', 'Download app sitemap or features overview as a PDF document.'],
        ['🛡️ Admin Panel', 'KYC approval/rejection, user management, ride oversight, VTPass admin controls.'],
      ];
      features.forEach(([title, desc]) => {
        doc.fontSize(13).fillColor('#1a6b3c').text(String(title));
        doc.fontSize(11).fillColor('#333').text(String(desc));
        doc.moveDown(0.5);
      });
    } else {
      doc.fontSize(16).fillColor('#c00').text('Document type not found');
      doc.fontSize(12).fillColor('#333').text('Supported types: sitemap, features');
    }

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
