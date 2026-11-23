import Link from "next/link";
import type { Metadata } from "next";

import { Icon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "How Rally works" };

const steps = [
  { icon: "plus", title: "Create a workspace", copy: "Give your group a home and choose the time zone that sets each check-in day." },
  { icon: "user", title: "Invite your people", copy: "Share a private link with friends. They sign in before they join." },
  { icon: "target", title: "Start a challenge", copy: "Pick a focus and a date range that suits your group." },
  { icon: "today", title: "Check in daily", copy: "Share what moved forward, what comes next, and anything the group should know." },
] as const;

const questions = [
  { question: "When does a check-in day end?", answer: "Each challenge uses its workspace time zone. You can edit today's check-in, but earlier days stay in the history." },
  { question: "How does a streak work?", answer: "A streak counts consecutive challenge-local calendar days with a valid check-in. It pauses across a missed day; it never uses rolling 24-hour windows." },
  { question: "What's the difference between a goal and a task?", answer: "Goals describe a result you are working toward and can track progress over time. Tasks are smaller actions with a simple status and optional due date." },
  { question: "How do invitations work?", answer: "Workspace owners create private links with an expiry and use limit. Sign in first, then open the link to join. Owners can revoke unused links." },
] as const;

export default function HelpPage() {
  return (
    <div className="page-wrap help-page">
      <header className="page-heading">
        <h1>How Rally works</h1>
        <p>A simple rhythm for making progress with people who care about your goals.</p>
      </header>

      <section className="help-steps" aria-label="Getting started">
        {steps.map((step, index) => (
          <article className="help-step" key={step.title}>
            <span className="help-step-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="help-step-icon" aria-hidden="true"><Icon name={step.icon} size={22} /></span>
            <h2>{step.title}</h2>
            <p>{step.copy}</p>
          </article>
        ))}
      </section>

      <section className="help-faq" aria-labelledby="help-faq-heading">
        <header><h2 id="help-faq-heading">A few useful details</h2><p>Answers about the day-to-day rhythm.</p></header>
        {questions.map((item) => (
          <details key={item.question}>
            <summary>{item.question}<span aria-hidden="true">＋</span></summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>

      <aside className="help-keyboard"><strong>Keyboard tip</strong><span>Use Tab to move through controls, Enter or Space to open menus, and Escape to close a menu or dialog.</span></aside>
      <Link className="button button--secondary help-settings-link" href="/settings">Go to Settings <Icon name="arrow" size={17} /></Link>
    </div>
  );
}
