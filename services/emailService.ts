
export const sendEmail = async (to: string, subject: string, body: string): Promise<void> => {
  // Simulate network latency typical of an SMTP server handshake
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Log the email to the console to simulate "sending"
  console.group('%c[Mock Email Service]', 'color: #4F46E5; font-weight: bold; font-size: 12px;');
  console.log(`%cTo: %c${to}`, 'color: gray; font-weight: bold;', 'color: #1F2937;');
  console.log(`%cSubject: %c${subject}`, 'color: gray; font-weight: bold;', 'color: #1F2937;');
  console.log(`%cBody:`, 'color: gray; font-weight: bold;');
  console.log(`%c${body}`, 'color: #4B5563; font-style: italic;');
  console.groupEnd();
};
