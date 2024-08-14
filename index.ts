import { Result } from 'true-myth';

/**
 * If a transformation fails, this is the object contained within the
 * `Result.error` field. It contains information on the provided input and
 * why it could not be transfomred
 */
export interface TransformError<T> {
  // The original value passed into the transformation function
  value: T;
  // An error message indicating why the transformation could not be completed
  message: string;
}

/**
 * A completion object is passed to a TransformHandler and contains pre-defined
 * functions for completing the transformation and returning results.
 */
export interface TransformCompletion<I, O> {
  // Call with the final transformation result to return a successfully transformed value
  ok(value: O): Result<O, TransformError<I>>;
  // Call with a message indicating why the transformation failed to return a transformation failure result
  err(message: string): Result<O, TransformError<I>>;
}

/**
 * A type alias for the type of object returned from a gauntlet transformation
 * call.
 */
export type TransformReturn<I, O> = Result<O, TransformError<I>>;

/**
 * The function that performs the transformation.
 * It accepts the input value and a completion object and must use to completion
 * object to either return a successful result containing the output value or a
 * failure result containing information indicating why the transformation was
 * not possible.
 */
export interface TransformHandler<I, O> {
  (input: I, completion: TransformCompletion<I, O>): TransformReturn<I, O>;
}

/**
 * The function returned from a transform creation. This is the function that
 * will be called on the input and has been previously bound with a
 * `TransformHandler`.
 *
 * ```typescript
 * const transformNumber: TransformFunction<string, number> =
 *   gauntlet.transform((input, { ok }) => ok(parseInt(input, 10)));
 * ```
 */
export interface TransformFunction<I, O> {
  (input: I): TransformReturn<I, O>;
}

/**
 * A type alias for the result returned from a call to a `TransformFunction`.
 */
export type TransformResult<I, O> = Result<O, TransformError<I>>;

/**
 * Apply a transform to a list of items and return all the results.
 * @param t The TransformFunction to apply
 * @param input A list of items to transofrm
 * @return A list of transformation results (in the same order as the input)
 */
export function apply<I, O>(t: TransformFunction<I, O>, input: I[]): TransformResult<I, O>[] {
  return input.map(t);
}

/**
 * Pass in a `TransformHandler` and create a new, callable `TransformFunction`.
 * @param f The `TransformHandler` that will perform the transformation
 * @return The callable `TransformFunction`
 */
export function transform<I, O>(f: TransformHandler<I, O>): TransformFunction<I, O> {
  return (input: I) => {
    const completion: TransformCompletion<I, O> = {
      ok(value) {
        return Result.ok(value);
      },
      err(message) {
        return Result.err({ message, value: input });
      },
    };
    return f(input, completion);
  };
}

/**
 * Utility function used to ignore all failure cases when using `unwrapOkResults`
 */
export const ignoreOnErr = () => { };

/**
 * Utility function used to throw an `Error` when the first failure is encountered during `unwrapOkResults`.
 * @param e The `TransformError`
 * @return never The function always throws
 */
export const throwOnErr = <I>(e: TransformError<I>) => {
  throw new Error(e.message);
};

/**
 * Options that can be passed to `unwrapOkResults`
 */
export interface UnwrapOkResultsOptions<I> {
  /**
   * An error handler for failed transformations. Typical uses:
   *  - log the failures
   *  - throw/abort on first failure (see `throwOnErr`)
   *  - collect all failures in an external data structure
   *  - ignore (see `ignoreOnErr`)
   * @param e The `TransformError`
   */
  onErr: (e: TransformError<I>) => void;
}

/**
 * Given a list of transform results, unwrap each one and return the successful values as a list.
 * The semantics of the error cases is dependent on the required `options.onErr` value.
 * @param items The transformation results
 * @param options Options to configure how the results are unwrapped
 * @return A list of unwrapped transformation output objects
 */
export function unwrapOkResults<I, O>(
  items: TransformResult<I, O>[],
  options: UnwrapOkResultsOptions<I>
): O[] {
  return items.reduce<O[]>((result, x) => {
    if (x.isOk) result.push(x.value);
    if (x.isErr) options.onErr(x.error);
    return result;
  }, []);
}

/**
 * Given a list of transform results, unwrap each one and return the successful values as a list.
 * If one item errors, the default Function will add default options in its place
 * @param items The transformation results
 * @param defaultFn Function to add default values if there is an error
 * @return A list of unwrapped transformation output objects
 */
export function unwrapOrDefault<I, O>(
  items: TransformResult<I, O>[],
  defaultFn: (e: TransformError<I>) => O
): O[] {
  return items.reduce<O[]>((result, x) => {
    if (x.isOk) result.push(x.value);
    if (x.isErr) result.push(defaultFn(x.error));
    return result;
  }, []);
}

