import { Portal } from '@ark-ui/react/portal';
import {
  Tour as ArkTour,
  useTour,
  type TourRootProps,
  type TourStepDetails,
} from '@ark-ui/react/tour';

import './Tour.css';

export interface TourProps extends Omit<TourRootProps, 'tour' | 'children'> {
  /** Tour step definitions. Each step can be type 'dialog' or 'tooltip'. */
  steps: TourStepDetails[];
  /**
   * Render prop that receives the `start` function so the caller can trigger
   * the tour from their own button / trigger element.
   *
   * @example
   * <Tour steps={steps}>
   *   {({ start }) => <button onClick={start}>Start tour</button>}
   * </Tour>
   */
  children: (api: { start: () => void }) => React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Tour.
 *
 * Anatomy (from @ark-ui/react/tour):
 *   Root > Portal > Backdrop, Spotlight, Positioner > Content >
 *     Arrow > ArrowTip, CloseTrigger, ProgressText, Title, Description,
 *     Control > Actions > ActionTrigger
 *
 * The Tour is a portal-based overlay; content is rendered outside the React
 * tree into document.body, so interaction tests must query via
 * within(document.body), not within(canvasElement).
 *
 * Styling uses Ark's data-scope/data-part attributes per the
 * unstyled-primitives-ark ADR — no custom class names.
 */
export function Tour({ steps, children, ...rootProps }: TourProps) {
  const tour = useTour({ steps });

  return (
    <>
      {children({ start: () => tour.start() })}
      <ArkTour.Root tour={tour} {...rootProps}>
        {/*
         * Only render the portalled overlay while the tour is open.
         * When closed, the Ark machine would keep a hidden alertdialog in the DOM
         * with an empty <h2> title, which fails axe's aria-dialog-name and
         * empty-heading rules. Conditional rendering avoids the empty-DOM state
         * entirely; focus restoration is still handled by the machine before the
         * Portal unmounts.
         */}
        {tour.open && (
          <Portal>
            <ArkTour.Backdrop />
            <ArkTour.Spotlight />
            <ArkTour.Positioner>
              <ArkTour.Content>
                <ArkTour.Arrow>
                  <ArkTour.ArrowTip />
                </ArkTour.Arrow>
                <ArkTour.CloseTrigger aria-label="Close tour">&#x2715;</ArkTour.CloseTrigger>
                <ArkTour.ProgressText />
                <ArkTour.Title />
                <ArkTour.Description />
                <ArkTour.Control>
                  <ArkTour.Actions>
                    {(actions) =>
                      actions.map((action) => (
                        <ArkTour.ActionTrigger key={action.label} action={action}>
                          {action.label}
                        </ArkTour.ActionTrigger>
                      ))
                    }
                  </ArkTour.Actions>
                </ArkTour.Control>
              </ArkTour.Content>
            </ArkTour.Positioner>
          </Portal>
        )}
      </ArkTour.Root>
    </>
  );
}
