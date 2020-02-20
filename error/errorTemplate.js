function ErrorTemplate(message, code) {
    if (!new.target) {
        return new ErrorTemplate(message, code);
    }

    Error.apply(this, arguments);
    Error.captureStackTrace(this, this.constructor);

    this.defaultMessage = 'DefaultMessage';
    this.defaultCode = 'DefaultStatusCode';

    Object.defineProperties(this, {
        message: {
            get: getMessage.bind(this),
            set: setMessage.bind(this)
        },
        originalMessage: {
            get: (function getter() {
                return this._message;
            }).bind(this),
            set: (function setter(newMessage) {
                throw new Error('Not Supported');
            }).bind(this)
        }
    });

    this.name = this.constructor.name;
    this.code = code !== undefined ? code : this.defaultCode;
    this.message = message !== undefined ? message : this.defaultMessage;

    this.stack = ((stack) => {
        if (stack.indexOf('DefaultDirectory/error') === -1) {
            return stack;
        }

        stack = stack.split('\n');
        stack.splice(1, 1);
        return stack.join('\n');
    })(this.stack);
}
