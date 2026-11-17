// Capa de control de tareas: traduce HTTP ⇄ TaskService. Sin reglas de negocio ni SQL.
class TaskController {
  constructor(taskService) {
    this.service = taskService;
  }

  list = async (req, res) => res.json(await this.service.list(req.user));
  create = async (req, res) => res.status(201).json(await this.service.create(req.user, req.body));
  update = async (req, res) => res.json(await this.service.update(req.user, req.params.id, req.body));
  remove = async (req, res) => {
    await this.service.remove(req.user, req.params.id);
    res.status(204).end();
  };
}

module.exports = { TaskController };
