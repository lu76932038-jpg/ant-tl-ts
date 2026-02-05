declare module 'react-quill' {
    import React from 'react';
    export interface ReactQuillProps {
        theme?: string;
        modules?: any;
        formats?: string[];
        value?: string;
        defaultValue?: string;
        placeHolder?: string;
        onChange?: (value: string, delta: any, source: string, editor: any) => void;
        style?: React.CSSProperties;
        className?: string;
        placeholder?: string;
    }
    export default class ReactQuill extends React.Component<ReactQuillProps> { }
}
