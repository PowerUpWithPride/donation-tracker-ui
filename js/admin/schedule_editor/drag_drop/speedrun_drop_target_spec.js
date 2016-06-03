import React from 'react';
import ReactDOM from 'react-dom';
import TestUtils from 'react-addons-test-utils';
import { DragSource } from 'react-dnd';

import { DnDWrapper } from 'ui/test/context';

import SpeedrunDropTarget from './speedrun_drop_target.js';
import sharedStyles from './shared.css';
import styles from './speedrun_drop_target.css';

function makeSource(type, props = {}, endDrag = () => {}) {
    return DragSource(type, { beginDrag: () => props, endDrag: endDrag}, function collect(connect, monitor) {
        return {
            connectDragSource: connect.dragSource(),
            connectDragPreview: connect.dragPreview(),
            isDragging: monitor.isDragging()
        }
    })(React.createClass({render: () => <div />}));
}

const Original = SpeedrunDropTarget.DecoratedComponent;

describe('SpeedrunTableDropTarget', () => {
    let subject;
    let backend;
    let moveSpeedrun;
    let legalMove;

    beforeEach(() => {
        moveSpeedrun = jasmine.createSpy('moveSpeedrun');
        legalMove = jasmine.createSpy().and.returnValue(false);
    });

    describe('wrapped component', () => {
        it('does not render droppable class by default', () => {
            subject = renderOriginal({before: false});
            expect(ReactDOM.findDOMNode(subject).querySelector('span').className).not.toContain(sharedStyles.droppable);
        });

        it('renders droppable class when canDrop and isOver are both true', () => {
            subject = renderOriginal({before: false, canDrop: true, isOver: true});
            expect(ReactDOM.findDOMNode(subject).querySelector('span').className).toContain(sharedStyles.droppable);
        });

        it('renders the before class when before is true', () => {
            subject = renderOriginal({before: true, canDrop: true, isOver: true});
            expect(ReactDOM.findDOMNode(subject).querySelector('span').className).toContain(styles.before);
        });

        it('renders the after class when before is false', () => {
            subject = renderOriginal({before: false, canDrop: true, isOver: true});
            expect(ReactDOM.findDOMNode(subject).querySelector('span').className).toContain(styles.after);
        });
    });

    describe('dnd component', () => {
        describe('when legalMove returns false', () => {
            it('dragging a Speedrun over does not set canDrop', () => {
                const Source = makeSource('Speedrun');
                subject = renderWithDragContext(Source);
                const source = TestUtils.findRenderedComponentWithType(subject, Source);
                const decorated = TestUtils.findRenderedComponentWithType(subject, SpeedrunDropTarget);
                backend.simulateBeginDrag([source.getHandlerId()]);
                backend.simulateHover([decorated.getHandlerId()]);
                const original = TestUtils.findRenderedComponentWithType(subject, Original);
                expect(original.props.canDrop).toBe(false);
                backend.simulateEndDrag();
            });
        });

        describe('when legalMove returns true', () => {
            beforeEach(() => {
                legalMove.and.returnValue(true);
            });

            it('dragging a Speedrun over sets canDrop', () => {
                const Source = makeSource('Speedrun');
                subject = renderWithDragContext(Source, {}, {legalMove: () => true});
                const source = TestUtils.findRenderedComponentWithType(subject, Source);
                const decorated = TestUtils.findRenderedComponentWithType(subject, SpeedrunDropTarget);
                backend.simulateBeginDrag([source.getHandlerId()]);
                backend.simulateHover([decorated.getHandlerId()]);
                const original = TestUtils.findRenderedComponentWithType(subject, Original);
                expect(original.props.canDrop).toBe(true);
                backend.simulateEndDrag();
            });

            it('dropping a Speedrun calls moveSpeedrun', () => {
                const sourceProps = {pk: 4};
                const targetProps = {pk: 1, before: true};
                const Source = makeSource('Speedrun', sourceProps, (props, monitor) => {
                    const result = monitor.getDropResult();
                    if (result && result.action) {
                        result.action(props.pk);
                    }
                });
                subject = renderWithDragContext(Source, sourceProps, targetProps);
                const source = TestUtils.findRenderedComponentWithType(subject, Source);
                const decorated = TestUtils.findRenderedComponentWithType(subject, SpeedrunDropTarget);
                backend.simulateBeginDrag([source.getHandlerId()]);
                backend.simulateHover([decorated.getHandlerId()]);
                backend.simulateDrop();
                backend.simulateEndDrag();
                expect(moveSpeedrun).toHaveBeenCalledWith(sourceProps.pk, targetProps.pk, targetProps.before);
            });
        });

        it('dragging anything else over does not call legalMove', () => {
            const Source = makeSource('NotASpeedrun');
            const legalMove = jasmine.createSpy('legalMove');
            subject = renderWithDragContext(Source, {}, {legalMove});
            const source = TestUtils.findRenderedComponentWithType(subject, Source);
            const decorated = TestUtils.findRenderedComponentWithType(subject, SpeedrunDropTarget);
            backend.simulateBeginDrag([source.getHandlerId()]);
            backend.simulateHover([decorated.getHandlerId()]);
            expect(legalMove).not.toHaveBeenCalled();
            backend.simulateEndDrag();
        });
    });

    function renderOriginal(props = {}, children = []) {
        const defaultProps = {
            pk: 1,
            isOver: false,
            canDrop: false,
            connectDropTarget: e => e,
            moveSpeedrun,
            legalMove,
            before: false,
        };
        return TestUtils.renderIntoDocument(
            <DnDWrapper>
                <Original
                    {...defaultProps}
                    {...props}
                >
                    {children}
                </Original>
            </DnDWrapper>
        );
    }

    function renderWithDragContext(Source, sourceProps = {}, targetProps = {}) {
        const defaultProps = {
            pk: 1,
            moveSpeedrun,
            legalMove,
            before: false,
        };
        const ret = TestUtils.renderIntoDocument(
            <DnDWrapper>
                <Source {...sourceProps} />
                <SpeedrunDropTarget
                    {...defaultProps}
                    {...targetProps}
                />
            </DnDWrapper>
        );
        backend = ret.getManager().getBackend();
        return ret;
    }
});
