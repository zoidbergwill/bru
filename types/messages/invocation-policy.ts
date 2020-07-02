export interface SetValue {
  // Use this value for the specified flag, overriding any default or user-set
  // value (unless append is set to true for repeatable flags).
  //
  // This field is repeated for repeatable flags. It is an error to set
  // multiple values for a flag that is not actually a repeatable flag.
  // This requires at least 1 value, if even the empty string.
  //
  // If the flag allows multiple values, all of its values are replaced with the
  // value or values from the policy (i.e., no diffing or merging is performed),
  // unless the append field (see below) is set to true.
  //
  // Note that some flags are tricky. For example, some flags look like boolean
  // flags, but are actually Void expansion flags that expand into other flags.
  // The Bazel flag parser will accept "--void_flag=false", but because
  // the flag is Void, the "=false" is ignored. It can get even trickier, like
  // "--novoid_flag" which is also an expansion flag with the type Void whose
  // name is explicitly "novoid_flag" and which expands into other flags that
  // are the opposite of "--void_flag". For expansion flags, it's best to
  // explicitly override the flags they expand into.
  //
  // Other flags may be differently tricky: A flag could have a converter that
  // converts some string to a list of values, but that flag may not itself have
  // allowMultiple set to true.
  //
  // An example is "--test_tag_filters": this flag sets its converter to
  // CommaSeparatedOptionListConverter, but does not set allowMultiple to true.
  // So "--test_tag_filters=foo,bar" results in ["foo", "bar"], however
  // "--test_tag_filters=foo --test_tag_filters=bar" results in just ["bar"]
  // since the 2nd value overrides the 1st.
  //
  // Similarly, "--test_tag_filters=foo,bar --test_tag_filters=baz,qux" results
  // in ["baz", "qux"]. For flags like these, the policy should specify
  // "foo,bar" instead of separately specifying "foo" and "bar" so that the
  // converter is appropriately invoked.
  //
  // Note that the opposite is not necessarily
  // true: for a flag that specifies allowMultiple=true, "--flag=foo,bar"
  // may fail to parse or result in an unexpected value.
  flagValue: string[];

  // Whether to allow this policy to be overridden by user-specified values.
  // When set, if the user specified a value for this flag, use the value
  // from the user, otherwise use the value specified in this policy.
  overridable?: boolean;

  // If true, and if the flag named in the policy is a repeatable flag, then
  // the values listed in flag_value do not replace all the user-set or default
  // values of the flag, but instead append to them. If the flag is not
  // repeatable, then this has no effect.
  append?: boolean;
}

export interface UseDefault {
  // Use the default value of the flag, as defined by Bazel (or equivalently, do
  // not allow the user to set this flag).
  //
  // Note on implementation: UseDefault sets the default by clearing the flag,
  // so that when the value is requested and no flag is found, the flag parser
  // returns the default. This is mostly relevant for expansion flags: it will
  // erase user values in *all* flags that the expansion flag expands to. Only
  // use this on expansion flags if this is acceptable behavior. Since the last
  // policy wins, later policies on this same flag will still remove the
  // expanded UseDefault, so there is a way around, but it's really best not to
  // use this on expansion flags at all.
}

export interface DisallowValues {
  // It is an error for the user to use any of these values (that is, the Bazel
  // command will fail), unless new_value or use_default is set.
  //
  // For repeatable flags, if any one of the values in the flag matches a value
  // in the list of disallowed values, an error is thrown.
  //
  // Care must be taken for flags with complicated converters. For example,
  // it's possible for a repeated flag to be of type List<List<T>>, so that
  // "--foo=a,b --foo=c,d" results in foo=[["a","b"], ["c", "d"]]. In this case,
  // it is not possible to disallow just "b", nor will ["b", "a"] match, nor
  // will ["b", "c"] (but ["a", "b"] will still match).
  disallowedValues: string[];

  // If set and if the value of the flag is disallowed (including the default
  // value of the flag if the user doesn't specify a value), use this value as
  // the value of the flag instead of raising an error. This does not apply to
  // repeatable flags and is ignored if the flag is a repeatable flag.
  newValue?: string;

  // If set and if the value of the flag is disallowed, use the default value
  // of the flag instead of raising an error. Unlike new_value, this works for
  // repeatable flags, but note that the default value for repeatable flags is
  // always empty.
  //
  // Note that it is an error to disallow the default value of the flag and
  // to set use_default, unless the flag is a repeatable flag where the
  // default value is always the empty list.
  useDefault?: UseDefault;
}

export interface AllowValues {
  // It is an error for the user to use any value not in this list, unless
  // new_value or use_default is set.
  allowedValues: string[];

  // If set and if the value of the flag is disallowed (including the default
  // value of the flag if the user doesn't specify a value), use this value as
  // the value of the flag instead of raising an error. This does not apply to
  // repeatable flags and is ignored if the flag is a repeatable flag.
  newValue?: string;

  // If set and if the value of the flag is disallowed, use the default value
  // of the flag instead of raising an error. Unlike new_value, this works for
  // repeatable flags, but note that the default value for repeatable flags is
  // always empty.
  //
  // Note that it is an error to disallow the default value of the flag and
  // to set use_default, unless the flag is a repeatable flag where the
  // default value is always the empty list.
  useDefault?: UseDefault;
}

// A policy for controlling the value of a flag.
export interface FlagPolicies {
  // The name of the flag to enforce this policy on.
  //
  // Note that this should be the full name of the flag, not the abbreviated
  // name of the flag. If the user specifies the abbreviated name of a flag,
  // that flag will be matched using its full name.
  //
  // The "no" prefix will not be parsed, so for boolean flags, use
  // the flag's full name and explicitly set it to true or false.
  flagName?: string;

  // If set, this flag policy is applied only if one of the given commands or a
  // command that inherits from one of the given commands is being run. For
  // instance, if "build" is one of the commands here, then this policy will
  // apply to any command that inherits from build, such as info, coverage, or
  // test. If empty, this flag policy is applied for all commands. This allows
  // the policy setter to add all policies to the proto without having to
  // determine which Bazel command the user is actually running. Additionally,
  // Bazel allows multiple flags to be defined by the same name, and the
  // specific flag definition is determined by the command.
  commands: string[];

  setValue?: SetValue;
  useDefault?: UseDefault;
  disallowValues?: DisallowValues;
  allowValues?: AllowValues;
}

// The --invocation_policy flag takes a base64-encoded binary-serialized or text
// formatted InvocationPolicy message.
export interface InvocationPolicy {
  // Order matters.
  // After expanding policies on expansion flags or flags with implicit
  // requirements, only the final policy on a specific flag will be enforced
  // onto the user's command line.
  flagPolicies: FlagPolicies[];
}