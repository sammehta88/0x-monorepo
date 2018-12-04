import { History } from 'history';
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';

import { colors } from 'ts/style/colors';

interface ButtonInterface {
    color?: string;
    children?: Node | string;
    isTransparent?: boolean;
    isNoBorder?: boolean;
    isNoPadding?: boolean;
    hasIcon?: boolean | string;
    isInline?: boolean;
    href?: string;
    onClick?: () => any;
    history?: History;
    theme?: {
        textColor: string;
    };
}

export const Button = styled.button<ButtonInterface>`
    appearance: none;
    border: 1px solid transparent;
    display: ${props => props.isInline && 'inline-block'};
    background-color: ${props => !props.isTransparent ? colors.brandLight : 'transparent'};
    border-color: ${props => (props.isTransparent && !props.isNoBorder) && '#6a6a6a'};
    color: ${props => props.color || props.theme.textColor};
    padding: ${props => !props.isNoPadding && '14px 22px'};
    text-align: center;
    font-size: 18px;
    text-decoration: none;
`;

export const Link = withRouter((props: ButtonInterface) => {
    const {
        children,
        history,
        href,
    } = props;
    const Component = Button.withComponent('a');
    const handleClick = () => history.push(href);

    return (
        <Component onClick={handleClick} {...props}>
            {children}
        </Component>
    );
});

// Added this, & + & doesnt really work since we switch with element types...
export const ButtonWrap = styled.div`
    button + button,
    a + a,
    a + button,
    button + a {
        margin-left: 10px;
    }
`;
