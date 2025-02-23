import { useState } from 'react';
import Joyride, { Step, CallBackProps } from 'react-joyride';

interface TourGuideProps {
  isFirstVisit?: boolean;
}

export function TourGuide({ isFirstVisit = true }: TourGuideProps) {
  const [run, setRun] = useState(isFirstVisit);

  const steps: Step[] = [
    {
      target: '.hero-section',
      content: 'Welcome to KEYDSO! We help you manage appointments efficiently across the globe.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.services-section',
      content: 'Browse through our comprehensive range of professional services tailored for various industries.',
      placement: 'top',
    },
    {
      target: '.features-section',
      content: 'Discover why businesses choose us for their appointment management needs.',
      placement: 'top',
    },
    {
      target: '.team-section',
      content: 'Meet our leadership team committed to revolutionizing appointment management.',
      placement: 'top',
    },
    {
      target: '.login-button',
      content: 'Ready to get started? Click here to log in or create an account!',
      placement: 'bottom',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      setRun(false);
      // Store in localStorage that the user has seen the tour
      localStorage.setItem('tourCompleted', 'true');
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      styles={{
        options: {
          primaryColor: '#22c55e', // green-500
          backgroundColor: '#ffffff',
          textColor: '#374151', // gray-700
          arrowColor: '#ffffff',
        },
      }}
      callback={handleJoyrideCallback}
    />
  );
}