import Joi from "joi";

export const validateRequest = (data: any) => {
  const schema = Joi.object({
    content: Joi.string().required(),
  });

  const { error } = schema.validate(data);
  if (error) {
    throw new Error(error.details[0].message);
  }

  return schema.validate(data);
};
